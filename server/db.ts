import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  diabetesImportBatches,
  diabetesExampleImportBatches,
  diabetesExampleRecords,
  registeredPatients,
  patientMedications,
  patientWoundAssessments,
  patientWoundMedia,
  patientRecordAuditEvents,
  diabetesPatientObservations,
  diabetesPatients,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily create a small pool for Supabase/Postgres. The low max connection
 * count is intentional: the deployment is a single 1 vCPU application and
 * Supabase connection limits are shared across all application instances.
 */
export async function getDb() {
  const databaseUrl = ENV.databaseUrl.trim();
  if (!_db && databaseUrl) {
    if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
      console.error("[Database] Invalid DATABASE_URL: expected a PostgreSQL connection string");
      return null;
    }

    try {
      _pool = new Pool({
        connectionString: databaseUrl,
        // Supabase pooler connections require TLS. The managed runtime's
        // certificate bundle reports the pooler's chain as self-signed, so
        // use encrypted transport without rejecting that chain. Credentials
        // and data remain protected in transit; the URL is still server-only.
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Partial<InsertUser> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    updateSet.updatedAt = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getDiabetesImportSummary() {
  const db = await getDb();
  if (!db) return { batch: null, patientCount: 0, observationCount: 0 };

  const [batch] = await db
    .select()
    .from(diabetesImportBatches)
    .orderBy(desc(diabetesImportBatches.createdAt))
    .limit(1);
  if (!batch) return { batch: null, patientCount: 0, observationCount: 0 };

  const [patientCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(diabetesPatients)
    .where(eq(diabetesPatients.importBatchId, batch.id));
  const [observationCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(diabetesPatientObservations)
    .innerJoin(diabetesPatients, eq(diabetesPatientObservations.patientId, diabetesPatients.id))
    .where(eq(diabetesPatients.importBatchId, batch.id));

  return {
    batch: {
      id: batch.id,
      sourceFilename: batch.sourceFilename,
      sourceRecordCount: batch.sourceRecordCount,
      createdAt: batch.createdAt,
    },
    patientCount: Number(patientCount?.count ?? 0),
    observationCount: Number(observationCount?.count ?? 0),
  };
}

export async function getDiabetesPatients(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const patients = await db
    .select()
    .from(diabetesPatients)
    .orderBy(asc(diabetesPatients.sourceRowNumber))
    .limit(limit);
  if (patients.length === 0) return [];

  const patientIds = patients.map((patient) => patient.id);
  const counts = await db
    .select({ patientId: diabetesPatientObservations.patientId, count: sql<number>`count(*)` })
    .from(diabetesPatientObservations)
    .where(inArray(diabetesPatientObservations.patientId, patientIds))
    .groupBy(diabetesPatientObservations.patientId);
  const countByPatient = new Map(counts.map((row) => [row.patientId, Number(row.count)]));

  return patients.map((patient) => ({ ...patient, observationCount: countByPatient.get(patient.id) ?? 0 }));
}

export async function getDiabetesPatient(patientId: number) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select({ patient: diabetesPatients, batch: diabetesImportBatches })
    .from(diabetesPatients)
    .innerJoin(diabetesImportBatches, eq(diabetesPatients.importBatchId, diabetesImportBatches.id))
    .where(eq(diabetesPatients.id, patientId))
    .limit(1);
  if (!row) return null;

  const [observationCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(diabetesPatientObservations)
    .where(eq(diabetesPatientObservations.patientId, patientId));
  return {
    ...row.patient,
    sourceFilename: row.batch.sourceFilename,
    observationCount: Number(observationCount?.count ?? 0),
  };
}

export async function getDiabetesPatientObservations(patientId: number, limit = 24) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(diabetesPatientObservations)
    .where(eq(diabetesPatientObservations.patientId, patientId))
    .orderBy(desc(diabetesPatientObservations.id))
    .limit(limit);
}

export async function getDiabetesExampleBatches(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: diabetesExampleImportBatches.id,
      sourceFilename: diabetesExampleImportBatches.sourceFilename,
      fileSha256: diabetesExampleImportBatches.fileSha256,
      sourceRecordCount: diabetesExampleImportBatches.sourceRecordCount,
      exactDuplicateGroupCount: diabetesExampleImportBatches.exactDuplicateGroupCount,
      exactDuplicateExtraCount: diabetesExampleImportBatches.exactDuplicateExtraCount,
      mappingVersion: diabetesExampleImportBatches.mappingVersion,
      status: diabetesExampleImportBatches.status,
      createdAt: diabetesExampleImportBatches.createdAt,
    })
    .from(diabetesExampleImportBatches)
    .orderBy(desc(diabetesExampleImportBatches.createdAt))
    .limit(limit);
}

export async function getDiabetesExampleRecords(batchId: number, offset = 0, limit = 50) {
  const db = await getDb();
  if (!db) return { records: [], total: 0, offset, limit, hasMore: false };

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(diabetesExampleRecords)
    .where(eq(diabetesExampleRecords.importBatchId, batchId));
  const total = Number(countRow?.count ?? 0);
  const records = await db
    .select({
      id: diabetesExampleRecords.id,
      importBatchId: diabetesExampleRecords.importBatchId,
      sourceRowNumber: diabetesExampleRecords.sourceRowNumber,
      rowSha256: diabetesExampleRecords.rowSha256,
      exactDuplicateGroup: diabetesExampleRecords.exactDuplicateGroup,
      isExactDuplicate: diabetesExampleRecords.isExactDuplicate,
      year: diabetesExampleRecords.year,
      gender: diabetesExampleRecords.gender,
      age: diabetesExampleRecords.age,
      location: diabetesExampleRecords.location,
      raceAfricanAmerican: diabetesExampleRecords.raceAfricanAmerican,
      raceAsian: diabetesExampleRecords.raceAsian,
      raceCaucasian: diabetesExampleRecords.raceCaucasian,
      raceHispanic: diabetesExampleRecords.raceHispanic,
      raceOther: diabetesExampleRecords.raceOther,
      hypertension: diabetesExampleRecords.hypertension,
      heartDisease: diabetesExampleRecords.heartDisease,
      smokingHistory: diabetesExampleRecords.smokingHistory,
      bmi: diabetesExampleRecords.bmi,
      hba1cLevel: diabetesExampleRecords.hba1cLevel,
      bloodGlucoseLevel: diabetesExampleRecords.bloodGlucoseLevel,
      diabetesLabel: diabetesExampleRecords.diabetesLabel,
    })
    .from(diabetesExampleRecords)
    .where(eq(diabetesExampleRecords.importBatchId, batchId))
    .orderBy(asc(diabetesExampleRecords.sourceRowNumber))
    .limit(limit)
    .offset(offset);

  return { records, total, offset, limit, hasMore: offset + records.length < total };
}

export type NewRegisteredPatient = {
  patientCode: string;
  displayName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  registrationLocation: string;
  identifyBy: string;
  type1: number;
  type2: number;
  gdm: number;
  sex: "FEMALE" | "MALE";
  clinicalNotes?: string | null;
  allergiesSummary?: string | null;
  diagnosesSummary?: string | null;
  riskFlags?: string | null;
  careTeam?: string | null;
  createdByUserId?: number | null;
};

export async function createRegisteredPatient(input: NewRegisteredPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [patient] = await db.insert(registeredPatients).values(input).returning({
    id: registeredPatients.id,
    patientCode: registeredPatients.patientCode,
    displayName: registeredPatients.displayName,
    registrationLocation: registeredPatients.registrationLocation,
    createdAt: registeredPatients.createdAt,
  });
  return patient;
}

export async function getRegisteredPatients(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: registeredPatients.id,
      patientCode: registeredPatients.patientCode,
      displayName: registeredPatients.displayName,
      phone: registeredPatients.phone,
      dateOfBirth: registeredPatients.dateOfBirth,
      age: registeredPatients.age,
      registrationLocation: registeredPatients.registrationLocation,
      identifyBy: registeredPatients.identifyBy,
      type1: registeredPatients.type1,
      type2: registeredPatients.type2,
      gdm: registeredPatients.gdm,
      sex: registeredPatients.sex,
      createdAt: registeredPatients.createdAt,
    })
    .from(registeredPatients)
    .where(isNull(registeredPatients.archivedAt))
    .orderBy(desc(registeredPatients.createdAt))
    .limit(limit);
}

export type RegisteredPatientProfileUpdate = Omit<NewRegisteredPatient, "patientCode" | "createdByUserId">;
export type NewPatientMedication = {
  patientId: number;
  medicationName: string;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  startedOn?: string | null;
  endedOn?: string | null;
  status: "active" | "paused" | "stopped" | "completed";
  notes?: string | null;
  recordedByUserId: number | null;
};
export type NewPatientWoundAssessment = {
  patientId: number;
  woundLabel: string;
  location: string;
  assessedOn: string;
  classification?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  tissueCharacteristics?: string | null;
  drainage?: string | null;
  odor?: string | null;
  painScore?: number | null;
  infectionIndicators?: string | null;
  treatmentPlan?: string | null;
  clinicianNotes?: string | null;
  mediaReference?: string | null;
  recordedByUserId: number | null;
};

export type NewPatientWoundMedia = {
  patientId: number;
  woundAssessmentId?: number | null;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSizeBytes: number;
  caption?: string | null;
  capturedOn?: string | null;
  capturedAt: Date;
  recordedByUserId: number | null;
};

async function recordPatientAudit(patientId: number, actorUserId: number | null, eventType: string, summary: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(patientRecordAuditEvents).values({ patientId, actorUserId, eventType, summary });
}

export async function getRegisteredPatientRecord(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  const [patient] = await db.select().from(registeredPatients).where(eq(registeredPatients.id, patientId)).limit(1);
  if (!patient) return null;
  const [medications, woundAssessments, media, auditEvents] = await Promise.all([
    db.select().from(patientMedications).where(eq(patientMedications.patientId, patientId)).orderBy(desc(patientMedications.createdAt)).limit(100),
    db.select().from(patientWoundAssessments).where(eq(patientWoundAssessments.patientId, patientId)).orderBy(desc(patientWoundAssessments.assessedOn)).limit(100),
    db.select().from(patientWoundMedia).where(eq(patientWoundMedia.patientId, patientId)).orderBy(desc(patientWoundMedia.createdAt)).limit(100),
    db.select().from(patientRecordAuditEvents).where(eq(patientRecordAuditEvents.patientId, patientId)).orderBy(desc(patientRecordAuditEvents.createdAt)).limit(100),
  ]);
  return { patient, medications, woundAssessments, media, auditEvents };
}

export async function getWoundPhotoHistory(input: { patientId?: number; from?: Date; to?: Date; limit: number; offset: number }) {
  const db = await getDb();
  if (!db) return { photos: [], total: 0, hasMore: false };
  const filters = [input.patientId ? eq(patientWoundMedia.patientId, input.patientId) : undefined, input.from ? gte(patientWoundMedia.capturedAt, input.from) : undefined, input.to ? lte(patientWoundMedia.capturedAt, input.to) : undefined].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;
  const [photos, totalRows] = await Promise.all([
    db.select({ id: patientWoundMedia.id, patientId: patientWoundMedia.patientId, patientCode: registeredPatients.patientCode, displayName: registeredPatients.displayName, registrationLocation: registeredPatients.registrationLocation, woundAssessmentId: patientWoundMedia.woundAssessmentId, storageUrl: patientWoundMedia.storageUrl, fileName: patientWoundMedia.fileName, mimeType: patientWoundMedia.mimeType, fileSizeBytes: patientWoundMedia.fileSizeBytes, caption: patientWoundMedia.caption, capturedOn: patientWoundMedia.capturedOn, capturedAt: patientWoundMedia.capturedAt, createdAt: patientWoundMedia.createdAt }).from(patientWoundMedia).innerJoin(registeredPatients, eq(patientWoundMedia.patientId, registeredPatients.id)).where(where).orderBy(desc(patientWoundMedia.capturedAt), desc(patientWoundMedia.createdAt)).limit(input.limit).offset(input.offset),
    db.select({ count: sql<number>`count(*)` }).from(patientWoundMedia).where(where),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  return { photos, total, hasMore: input.offset + photos.length < total };
}

export async function updateRegisteredPatient(patientId: number, input: RegisteredPatientProfileUpdate, actorUserId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [patient] = await db.update(registeredPatients).set({ ...input, updatedAt: new Date() }).where(and(eq(registeredPatients.id, patientId), isNull(registeredPatients.archivedAt))).returning();
  if (!patient) return null;
  await recordPatientAudit(patientId, actorUserId, "profile_updated", "Patient profile updated");
  return patient;
}

export async function addPatientMedication(input: NewPatientMedication) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [medication] = await db.insert(patientMedications).values(input).returning();
  await recordPatientAudit(input.patientId, input.recordedByUserId, "medication_added", `Medication added: ${input.medicationName}`);
  return medication;
}

export async function addPatientWoundAssessment(input: NewPatientWoundAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [assessment] = await db.insert(patientWoundAssessments).values(input).returning();
  await recordPatientAudit(input.patientId, input.recordedByUserId, "wound_assessment_added", `Wound assessment added: ${input.woundLabel}`);
  return assessment;
}

export async function addPatientWoundMedia(input: NewPatientWoundMedia & { imageBuffer: Buffer }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (input.woundAssessmentId) {
    const [assessment] = await db.select({ id: patientWoundAssessments.id }).from(patientWoundAssessments).where(and(eq(patientWoundAssessments.id, input.woundAssessmentId), eq(patientWoundAssessments.patientId, input.patientId))).limit(1);
    if (!assessment) throw new Error("Wound assessment does not belong to this patient");
  }
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "wound-photo";
  const stored = await storagePut(`patient-wound-media/${input.patientId}/${safeName}`, input.imageBuffer, input.mimeType);
  const [media] = await db.insert(patientWoundMedia).values({ patientId: input.patientId, woundAssessmentId: input.woundAssessmentId ?? null, storageKey: stored.key, storageUrl: stored.url, fileName: input.fileName, mimeType: input.mimeType, fileSizeBytes: input.fileSizeBytes, caption: input.caption ?? null, capturedOn: input.capturedOn ?? null, recordedByUserId: input.recordedByUserId }).returning();
  await recordPatientAudit(input.patientId, input.recordedByUserId, "wound_photo_uploaded", `Wound photo uploaded: ${input.fileName} at ${input.capturedAt.toISOString()}`);
  return media;
}

export async function archiveRegisteredPatient(patientId: number, actorUserId: number | null, archiveReason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [patient] = await db.update(registeredPatients).set({ archivedAt: new Date(), archivedByUserId: actorUserId, archiveReason, updatedAt: new Date() }).where(and(eq(registeredPatients.id, patientId), isNull(registeredPatients.archivedAt))).returning({ id: registeredPatients.id, patientCode: registeredPatients.patientCode, archivedAt: registeredPatients.archivedAt });
  if (!patient) return null;
  await recordPatientAudit(patientId, actorUserId, "patient_archived", `Patient archived: ${archiveReason}`);
  return patient;
}

export async function restoreRegisteredPatient(patientId: number, actorUserId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [patient] = await db.update(registeredPatients).set({ archivedAt: null, archivedByUserId: null, archiveReason: null, updatedAt: new Date() }).where(eq(registeredPatients.id, patientId)).returning({ id: registeredPatients.id, patientCode: registeredPatients.patientCode });
  if (!patient) return null;
  await recordPatientAudit(patientId, actorUserId, "patient_restored", "Patient restored to active records");
  return patient;
}

export async function exportRegisteredPatient(patientId: number, actorUserId: number | null) {
  const record = await getRegisteredPatientRecord(patientId);
  if (!record) return null;
  await recordPatientAudit(patientId, actorUserId, "record_exported", "Patient record exported");
  return record;
}
