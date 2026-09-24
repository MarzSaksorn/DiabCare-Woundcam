import {
  bigint,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing the existing Manus OAuth/session flow.
 * Database columns use snake_case to match the Supabase schema while the
 * application-facing properties remain camelCase for compatibility.
 */
const userRole = pgEnum("user_role", ["user", "admin"]);
const patientSex = pgEnum("patient_sex", ["FEMALE", "MALE"]);

export const users = pgTable("users", {
  id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const diabetesImportBatches = pgTable("diabetes_import_batches", {
  id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
  sourceFilename: varchar("source_filename", { length: 255 }).notNull(),
  fileSha256: varchar("file_sha256", { length: 64 }).notNull().unique(),
  sourceRecordCount: integer("source_record_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type DiabetesImportBatch = typeof diabetesImportBatches.$inferSelect;
export type InsertDiabetesImportBatch = typeof diabetesImportBatches.$inferInsert;

export const diabetesPatients = pgTable(
  "diabetes_patients",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    importBatchId: bigint("import_batch_id", { mode: "number" })
      .notNull()
      .references(() => diabetesImportBatches.id, { onDelete: "restrict" }),
    sourceRowNumber: integer("source_row_number").notNull(),
    age: varchar("age", { length: 32 }).notNull(),
    identifyBy: varchar("identify_by", { length: 32 }).notNull(),
    type1: smallint("type1").notNull(),
    type2: smallint("type2").notNull(),
    gdm: smallint("gdm").notNull(),
    sex: patientSex("sex").notNull(),
    dmOnset: smallint("dm_onset").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    batchRowUnique: uniqueIndex("diabetes_patients_batch_row_unique").on(table.importBatchId, table.sourceRowNumber),
    batchIndex: index("diabetes_patients_import_batch_idx").on(table.importBatchId),
  }),
);

export type DiabetesPatient = typeof diabetesPatients.$inferSelect;
export type InsertDiabetesPatient = typeof diabetesPatients.$inferInsert;

export const diabetesPatientObservations = pgTable(
  "diabetes_patient_observations",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientId: bigint("patient_id", { mode: "number" })
      .notNull()
      .references(() => diabetesPatients.id, { onDelete: "cascade" }),
    sourceColumn: varchar("source_column", { length: 128 }).notNull(),
    dictionaryField: varchar("dictionary_field", { length: 128 }).notNull(),
    periodKey: integer("period_key"),
    valueNumber: numeric("value_number", { precision: 18, scale: 6, mode: "number" }),
    valueText: text("value_text"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    patientColumnUnique: uniqueIndex("diabetes_observations_patient_column_unique").on(table.patientId, table.sourceColumn),
    patientIndex: index("diabetes_observations_patient_idx").on(table.patientId),
    dictionaryIndex: index("diabetes_observations_dictionary_period_idx").on(table.dictionaryField, table.periodKey),
  }),
);

export type DiabetesPatientObservation = typeof diabetesPatientObservations.$inferSelect;
export type InsertDiabetesPatientObservation = typeof diabetesPatientObservations.$inferInsert;

export { patientSex, userRole };
