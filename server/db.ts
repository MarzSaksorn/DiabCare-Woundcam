import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  diabetesImportBatches,
  diabetesExampleImportBatches,
  diabetesExampleRecords,
  diabetesPatientObservations,
  diabetesPatients,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
