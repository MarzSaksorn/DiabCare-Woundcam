import {
  bigint,
  boolean,
  date,
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

export const diabetesExampleImportBatches = pgTable("diabetes_example_import_batches", {
  id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
  sourceFilename: varchar("source_filename", { length: 255 }).notNull(),
  fileSha256: varchar("file_sha256", { length: 64 }).notNull().unique(),
  sourceRecordCount: integer("source_record_count").notNull(),
  exactDuplicateGroupCount: integer("exact_duplicate_group_count").notNull(),
  exactDuplicateExtraCount: integer("exact_duplicate_extra_count").notNull(),
  mappingVersion: varchar("mapping_version", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type DiabetesExampleImportBatch = typeof diabetesExampleImportBatches.$inferSelect;

export const diabetesExampleRecords = pgTable(
  "diabetes_example_records",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    importBatchId: bigint("import_batch_id", { mode: "number" })
      .notNull()
      .references(() => diabetesExampleImportBatches.id, { onDelete: "restrict" }),
    sourceRowNumber: integer("source_row_number").notNull(),
    rowSha256: varchar("row_sha256", { length: 64 }).notNull(),
    exactDuplicateGroup: varchar("exact_duplicate_group", { length: 64 }),
    isExactDuplicate: boolean("is_exact_duplicate").notNull().default(false),
    year: integer("year").notNull(),
    gender: varchar("gender", { length: 32 }).notNull(),
    age: numeric("age", { precision: 10, scale: 4, mode: "number" }).notNull(),
    location: varchar("location", { length: 128 }).notNull(),
    raceAfricanAmerican: smallint("race_african_american").notNull(),
    raceAsian: smallint("race_asian").notNull(),
    raceCaucasian: smallint("race_caucasian").notNull(),
    raceHispanic: smallint("race_hispanic").notNull(),
    raceOther: smallint("race_other").notNull(),
    hypertension: smallint("hypertension").notNull(),
    heartDisease: smallint("heart_disease").notNull(),
    smokingHistory: varchar("smoking_history", { length: 32 }).notNull(),
    bmi: numeric("bmi", { precision: 10, scale: 4, mode: "number" }).notNull(),
    hba1cLevel: numeric("hba1c_level", { precision: 10, scale: 4, mode: "number" }).notNull(),
    bloodGlucoseLevel: integer("blood_glucose_level").notNull(),
    diabetesLabel: smallint("diabetes_label").notNull(),
    clinicalNotes: text("clinical_notes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    batchRowUnique: uniqueIndex("diabetes_example_records_batch_row_unique").on(table.importBatchId, table.sourceRowNumber),
    batchRowIndex: index("diabetes_example_records_batch_row_idx").on(table.importBatchId, table.sourceRowNumber),
    batchYearIndex: index("diabetes_example_records_batch_year_idx").on(table.importBatchId, table.year),
    batchLabelIndex: index("diabetes_example_records_batch_label_idx").on(table.importBatchId, table.diabetesLabel),
  }),
);

export type DiabetesExampleRecord = typeof diabetesExampleRecords.$inferSelect;

export const registeredPatients = pgTable(
  "registered_patients",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientCode: varchar("patient_code", { length: 64 }).notNull().unique(),
    displayName: varchar("display_name", { length: 160 }),
    phone: varchar("phone", { length: 32 }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    age: integer("age"),
    registrationLocation: varchar("registration_location", { length: 160 }).notNull(),
    identifyBy: varchar("identify_by", { length: 32 }).notNull(),
    type1: smallint("type1").notNull().default(0),
    type2: smallint("type2").notNull().default(0),
    gdm: smallint("gdm").notNull().default(0),
    sex: patientSex("sex").notNull(),
    clinicalNotes: text("clinical_notes"),
    allergiesSummary: text("allergies_summary"),
    diagnosesSummary: text("diagnoses_summary"),
    riskFlags: text("risk_flags"),
    careTeam: text("care_team"),
    importedPatientId: bigint("imported_patient_id", { mode: "number" }).references(() => diabetesPatients.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    archivedByUserId: bigint("archived_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    archiveReason: text("archive_reason"),
    createdByUserId: bigint("created_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIndex: index("registered_patients_created_at_idx").on(table.createdAt),
    locationIndex: index("registered_patients_location_idx").on(table.registrationLocation),
  }),
);

export type RegisteredPatient = typeof registeredPatients.$inferSelect;

export const patientMedications = pgTable(
  "patient_medications",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientId: bigint("patient_id", { mode: "number" }).notNull().references(() => registeredPatients.id, { onDelete: "restrict" }),
    medicationName: varchar("medication_name", { length: 160 }).notNull(),
    dose: varchar("dose", { length: 80 }),
    route: varchar("route", { length: 80 }),
    frequency: varchar("frequency", { length: 120 }),
    startedOn: date("started_on", { mode: "string" }),
    endedOn: date("ended_on", { mode: "string" }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    notes: text("notes"),
    recordedByUserId: bigint("recorded_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({ patientIndex: index("patient_medications_patient_idx").on(table.patientId, table.createdAt) }),
);

export type PatientMedication = typeof patientMedications.$inferSelect;

export const patientWoundAssessments = pgTable(
  "patient_wound_assessments",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientId: bigint("patient_id", { mode: "number" }).notNull().references(() => registeredPatients.id, { onDelete: "restrict" }),
    woundLabel: varchar("wound_label", { length: 160 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    assessedOn: date("assessed_on", { mode: "string" }).notNull(),
    classification: varchar("classification", { length: 80 }),
    lengthCm: numeric("length_cm", { precision: 10, scale: 2, mode: "number" }),
    widthCm: numeric("width_cm", { precision: 10, scale: 2, mode: "number" }),
    depthCm: numeric("depth_cm", { precision: 10, scale: 2, mode: "number" }),
    tissueCharacteristics: text("tissue_characteristics"),
    drainage: varchar("drainage", { length: 80 }),
    odor: varchar("odor", { length: 80 }),
    painScore: integer("pain_score"),
    infectionIndicators: text("infection_indicators"),
    treatmentPlan: text("treatment_plan"),
    clinicianNotes: text("clinician_notes"),
    mediaReference: text("media_reference"),
    recordedByUserId: bigint("recorded_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({ patientDateIndex: index("patient_wound_assessments_patient_date_idx").on(table.patientId, table.assessedOn) }),
);

export type PatientWoundAssessment = typeof patientWoundAssessments.$inferSelect;

export const patientWoundMedia = pgTable(
  "patient_wound_media",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientId: bigint("patient_id", { mode: "number" }).notNull().references(() => registeredPatients.id, { onDelete: "restrict" }),
    woundAssessmentId: bigint("wound_assessment_id", { mode: "number" }).references(() => patientWoundAssessments.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull().unique(),
    storageUrl: text("storage_url").notNull(),
    fileName: varchar("file_name", { length: 240 }).notNull(),
    mimeType: varchar("mime_type", { length: 80 }).notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    caption: varchar("caption", { length: 500 }),
    capturedOn: date("captured_on", { mode: "string" }),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }),
    recordedByUserId: bigint("recorded_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({ patientDateIndex: index("patient_wound_media_patient_date_idx").on(table.patientId, table.createdAt), woundIndex: index("patient_wound_media_wound_idx").on(table.woundAssessmentId) }),
);

export type PatientWoundMedia = typeof patientWoundMedia.$inferSelect;

export const patientRecordAuditEvents = pgTable(
  "patient_record_audit_events",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().primaryKey(),
    patientId: bigint("patient_id", { mode: "number" }).notNull().references(() => registeredPatients.id, { onDelete: "restrict" }),
    actorUserId: bigint("actor_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 48 }).notNull(),
    summary: varchar("summary", { length: 240 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({ patientDateIndex: index("patient_record_audit_patient_date_idx").on(table.patientId, table.createdAt) }),
);

export type PatientRecordAuditEvent = typeof patientRecordAuditEvents.$inferSelect;

export { patientSex, userRole };
