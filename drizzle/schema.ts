import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, uniqueIndex, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const diabetesImportBatches = mysqlTable("diabetesImportBatches", {
  id: int("id").autoincrement().primaryKey(),
  sourceFilename: varchar("sourceFilename", { length: 255 }).notNull(),
  fileSha256: varchar("fileSha256", { length: 64 }).notNull().unique(),
  sourceRecordCount: int("sourceRecordCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiabetesImportBatch = typeof diabetesImportBatches.$inferSelect;
export type InsertDiabetesImportBatch = typeof diabetesImportBatches.$inferInsert;

export const diabetesPatients = mysqlTable("diabetesPatients", {
  id: int("id").autoincrement().primaryKey(),
  importBatchId: int("importBatchId").notNull(),
  sourceRowNumber: int("sourceRowNumber").notNull(),
  age: varchar("age", { length: 32 }).notNull(),
  identifyBy: varchar("identifyBy", { length: 32 }).notNull(),
  type1: int("type1").notNull(),
  type2: int("type2").notNull(),
  gdm: int("gdm").notNull(),
  sex: mysqlEnum("sex", ["FEMALE", "MALE"]).notNull(),
  dmOnset: int("dmOnset").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  batchRowUnique: uniqueIndex("diabetesPatients_batch_row_unique").on(table.importBatchId, table.sourceRowNumber),
  batchIndex: index("diabetesPatients_batch_index").on(table.importBatchId),
}));

export type DiabetesPatient = typeof diabetesPatients.$inferSelect;
export type InsertDiabetesPatient = typeof diabetesPatients.$inferInsert;

export const diabetesPatientObservations = mysqlTable("diabetesPatientObservations", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  sourceColumn: varchar("sourceColumn", { length: 128 }).notNull(),
  dictionaryField: varchar("dictionaryField", { length: 128 }).notNull(),
  periodKey: int("periodKey"),
  valueNumber: decimal("valueNumber", { precision: 18, scale: 6 }),
  valueText: text("valueText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  patientColumnUnique: uniqueIndex("diabetesObservations_patient_column_unique").on(table.patientId, table.sourceColumn),
  patientIndex: index("diabetesObservations_patient_index").on(table.patientId),
  dictionaryIndex: index("diabetesObservations_dictionary_index").on(table.dictionaryField, table.periodKey),
}));

export type DiabetesPatientObservation = typeof diabetesPatientObservations.$inferSelect;
export type InsertDiabetesPatientObservation = typeof diabetesPatientObservations.$inferInsert;
