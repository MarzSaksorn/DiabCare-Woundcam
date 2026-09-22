import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { diabetesImportBatches, diabetesPatientObservations, diabetesPatients, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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
    const updateSet: Record<string, unknown> = {};

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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

  const [batch] = await db.select().from(diabetesImportBatches).orderBy(desc(diabetesImportBatches.createdAt)).limit(1);
  if (!batch) return { batch: null, patientCount: 0, observationCount: 0 };

  const [patientCount] = await db.select({ count: sql<number>`count(*)` }).from(diabetesPatients).where(eq(diabetesPatients.importBatchId, batch.id));
  const [observationCount] = await db.select({ count: sql<number>`count(*)` }).from(diabetesPatientObservations).innerJoin(diabetesPatients, eq(diabetesPatientObservations.patientId, diabetesPatients.id)).where(eq(diabetesPatients.importBatchId, batch.id));

  return {
    batch: { id: batch.id, sourceFilename: batch.sourceFilename, sourceRecordCount: batch.sourceRecordCount, createdAt: batch.createdAt },
    patientCount: Number(patientCount?.count ?? 0),
    observationCount: Number(observationCount?.count ?? 0),
  };
}

export async function getDiabetesPatients(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const patients = await db.select().from(diabetesPatients).orderBy(asc(diabetesPatients.sourceRowNumber)).limit(limit);
  if (patients.length === 0) return [];

  const patientIds = patients.map((patient) => patient.id);
  const counts = await db.select({ patientId: diabetesPatientObservations.patientId, count: sql<number>`count(*)` }).from(diabetesPatientObservations).where(inArray(diabetesPatientObservations.patientId, patientIds)).groupBy(diabetesPatientObservations.patientId);
  const countByPatient = new Map(counts.map((row) => [row.patientId, Number(row.count)]));

  return patients.map((patient) => ({ ...patient, observationCount: countByPatient.get(patient.id) ?? 0 }));
}
