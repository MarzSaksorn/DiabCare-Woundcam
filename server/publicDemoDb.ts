import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type JsonRecord = Record<string, unknown>;
type DatabaseHandle = InstanceType<typeof Database>;
type DbResult<K extends keyof typeof import("./db")> = Awaited<ReturnType<(typeof import("./db"))[K]>>;
type DashboardSummary = DbResult<"getClinicalDashboardSummary">;
type ImportSummary = DbResult<"getDiabetesImportSummary">;
type ImportedPage = DbResult<"getDiabetesPatientsPage">;
type ImportedPatient = NonNullable<DbResult<"getDiabetesPatient">>;
type ImportedObservation = DbResult<"getDiabetesPatientObservations">[number];
type ExampleBatch = DbResult<"getDiabetesExampleBatches">[number];
type ExamplePage = DbResult<"getDiabetesExampleRecords">;
type RegisteredPage = DbResult<"getRegisteredPatientsPage">;
type RegisteredRecord = NonNullable<DbResult<"getRegisteredPatientRecord">>;
type PhotoHistory = DbResult<"getWoundPhotoHistory">;

const DEMO_DATE = "2026-10-20T09:00:00.000Z";
const COHORT_FILE = "synthetic-demo-cohort.json";
const EXAMPLE_FILE = "synthetic-wound-examples.json";
const ASSET_PREFIX = "/demo-media/";

const profiles = [
  { id: 1, code: "DEMO-1001", age: 62, sex: "FEMALE", context: "type2", location: "Demo Clinic North" },
  { id: 2, code: "DEMO-1002", age: 54, sex: "MALE", context: "type2", location: "Demo Clinic East" },
  { id: 3, code: "DEMO-1003", age: 70, sex: "FEMALE", context: "type1", location: "Demo Clinic West" },
  { id: 4, code: "DEMO-1004", age: 47, sex: "MALE", context: "type2", location: "Demo Clinic North" },
  { id: 5, code: "DEMO-1005", age: 58, sex: "FEMALE", context: "gdm", location: "Demo Clinic South" },
  { id: 6, code: "DEMO-1006", age: 66, sex: "MALE", context: "type2", location: "Demo Clinic East" },
  { id: 7, code: "DEMO-1007", age: 51, sex: "FEMALE", context: "type1", location: "Demo Clinic West" },
  { id: 8, code: "DEMO-1008", age: 73, sex: "MALE", context: "type2", location: "Demo Clinic North" },
  { id: 9, code: "DEMO-1009", age: 44, sex: "FEMALE", context: "type2", location: "Demo Clinic South" },
  { id: 10, code: "DEMO-1010", age: 60, sex: "MALE", context: "type2", location: "Demo Clinic East" },
  { id: 11, code: "DEMO-1011", age: 56, sex: "FEMALE", context: "type1", location: "Demo Clinic West" },
  { id: 12, code: "DEMO-1012", age: 68, sex: "MALE", context: "type2", location: "Demo Clinic North" },
] as const;

const imported = Array.from({ length: 12 }, (_, index) => {
  const id = 101 + index;
  const age = 38 + index * 3;
  const type = index % 4 === 0 ? "type1" : index % 7 === 0 ? "gdm" : "type2";
  const row = {
    id,
    importBatchId: 1,
    sourceRowNumber: index + 1,
    age: String(age),
    identifyBy: "synthetic-demo",
    type1: Number(type === "type1"),
    type2: Number(type === "type2"),
    gdm: Number(type === "gdm"),
    sex: index % 2 ? "MALE" : "FEMALE",
    createdAt: new Date(Date.UTC(2026, 9, 1 + index)).toISOString(),
  };
  return { ...row, context: type };
});

function json(value: JsonRecord) {
  return JSON.stringify(value);
}

function parse<T>(value: string): T {
  return JSON.parse(value) as T;
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function diabetesContext(profile: (typeof profiles)[number]) {
  return {
    type1: Number(profile.context === "type1"),
    type2: Number(profile.context === "type2"),
    gdm: Number(profile.context === "gdm"),
  };
}

function makePatients() {
  return profiles.map((profile, index) => {
    const now = isoDaysAgo(index + 1);
    return {
      id: profile.id,
      patientCode: profile.code,
      displayName: `Sample Patient ${String(index + 1).padStart(2, "0")}`,
      phone: null,
      dateOfBirth: `${2026 - profile.age}-04-${String((index % 27) + 1).padStart(2, "0")}`,
      age: profile.age,
      registrationLocation: profile.location,
      identifyBy: "Synthetic demo identifier",
      ...diabetesContext(profile),
      sex: profile.sex,
      clinicalNotes: "Synthetic interface data only. Not a real patient record and not for clinical use.",
      allergiesSummary: "Synthetic demo: no clinical allergy information.",
      diagnosesSummary: "Synthetic demo context only; not a diagnosis.",
      riskFlags: "Illustrative placeholder; not a clinical risk assessment.",
      careTeam: "Demo Care Team",
      importedPatientId: null,
      archivedAt: null,
      archivedByUserId: null,
      archiveReason: null,
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function makeAssessments() {
  const examples = [
    { id: 1, patientId: 1, label: "Synthetic plantar example A", location: "Left plantar schematic", day: 3, size: [2.4, 1.8, 0.2], pain: 2 },
    { id: 2, patientId: 1, label: "Synthetic plantar example A", location: "Left plantar schematic", day: 1, size: [2.1, 1.6, 0.2], pain: 1 },
    { id: 3, patientId: 2, label: "Synthetic heel example B", location: "Right heel schematic", day: 4, size: [1.8, 1.2, 0.1], pain: 3 },
    { id: 4, patientId: 3, label: "Synthetic toe example C", location: "Second toe schematic", day: 6, size: [1.1, 0.8, 0.1], pain: 1 },
    { id: 5, patientId: 4, label: "Synthetic plantar example D", location: "Forefoot schematic", day: 8, size: [2.7, 1.9, 0.3], pain: 4 },
  ];
  return examples.map((entry) => ({
    id: entry.id,
    patientId: entry.patientId,
    woundLabel: entry.label,
    location: entry.location,
    assessedOn: isoDaysAgo(entry.day).slice(0, 10),
    classification: "Synthetic illustration",
    lengthCm: entry.size[0],
    widthCm: entry.size[1],
    depthCm: entry.size[2],
    tissueCharacteristics: "Illustrative placeholder only; not a clinical finding.",
    drainage: "Demo placeholder",
    odor: "Not assessed in demo",
    painScore: entry.pain,
    infectionIndicators: "No clinical interpretation. Synthetic demo record.",
    treatmentPlan: "No treatment plan. This screen uses fabricated demo content.",
    clinicianNotes: "Illustrative example only; not for clinical use.",
    mediaReference: null,
    recordedByUserId: null,
    createdAt: isoDaysAgo(entry.day),
    updatedAt: isoDaysAgo(entry.day),
  }));
}

function makeMedia() {
  return [
    { id: 1, patientId: 1, assessmentId: 1, asset: "synthetic-wound-example-a.svg", day: 3 },
    { id: 2, patientId: 1, assessmentId: 2, asset: "synthetic-wound-example-b.svg", day: 1 },
    { id: 3, patientId: 2, assessmentId: 3, asset: "synthetic-wound-example-c.svg", day: 4 },
    { id: 4, patientId: 3, assessmentId: 4, asset: "synthetic-wound-example-d.svg", day: 6 },
    { id: 5, patientId: 4, assessmentId: 5, asset: "synthetic-wound-example-a.svg", day: 8 },
  ].map((entry) => ({
    id: entry.id,
    patientId: entry.patientId,
    woundAssessmentId: entry.assessmentId,
    storageKey: `public-demo/${entry.asset}`,
    storageUrl: `${ASSET_PREFIX}${entry.asset}`,
    fileName: entry.asset,
    mimeType: "image/svg+xml",
    fileSizeBytes: 0,
    caption: "Synthetic illustration. Not a patient photograph.",
    capturedOn: isoDaysAgo(entry.day).slice(0, 10),
    capturedAt: isoDaysAgo(entry.day),
    hiddenAt: null,
    hiddenByUserId: null,
    hiddenReason: null,
    recordedByUserId: null,
    createdAt: isoDaysAgo(entry.day),
  }));
}

function makeMedication() {
  return [
    { id: 1, patientId: 1, medicationName: "Example medication A", dose: "Demo value", route: "Demo value", frequency: "Illustrative only", startedOn: "2026-10-01", endedOn: null, status: "active", notes: "Synthetic example; not a prescription.", recordedByUserId: null, createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(2) },
    { id: 2, patientId: 2, medicationName: "Example medication B", dose: "Demo value", route: "Demo value", frequency: "Illustrative only", startedOn: "2026-09-20", endedOn: null, status: "active", notes: "Synthetic example; not a prescription.", recordedByUserId: null, createdAt: isoDaysAgo(4), updatedAt: isoDaysAgo(4) },
  ];
}

function makeAuditEvents() {
  return [
    { id: 1, patientId: 1, actorUserId: null, eventType: "demo_seeded", summary: "Synthetic demo record seeded for interface preview", createdAt: isoDaysAgo(3) },
    { id: 2, patientId: 2, actorUserId: null, eventType: "demo_seeded", summary: "Synthetic demo record seeded for interface preview", createdAt: isoDaysAgo(4) },
    { id: 3, patientId: 3, actorUserId: null, eventType: "demo_seeded", summary: "Synthetic demo record seeded for interface preview", createdAt: isoDaysAgo(6) },
  ];
}

function ensureSchema(db: DatabaseHandle) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS demo_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS demo_registered_patients (
      id INTEGER PRIMARY KEY, patient_code TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      registration_location TEXT NOT NULL, context TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL, data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_registered_context_idx ON demo_registered_patients(archived, context, updated_at);
    CREATE TABLE IF NOT EXISTS demo_patient_children (
      id INTEGER NOT NULL, patient_id INTEGER NOT NULL, kind TEXT NOT NULL, sort_at TEXT NOT NULL,
      data_json TEXT NOT NULL, FOREIGN KEY(patient_id) REFERENCES demo_registered_patients(id),
      PRIMARY KEY(kind, id)
    );
    CREATE INDEX IF NOT EXISTS demo_children_patient_kind_idx ON demo_patient_children(patient_id, kind, sort_at);
    CREATE TABLE IF NOT EXISTS demo_import_batches (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS demo_import_patients (
      id INTEGER PRIMARY KEY, import_batch_id INTEGER NOT NULL, source_row_number INTEGER NOT NULL,
      age TEXT NOT NULL, identify_by TEXT NOT NULL, context TEXT NOT NULL, sex TEXT NOT NULL,
      created_at TEXT NOT NULL, data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_import_patient_row_idx ON demo_import_patients(source_row_number, id);
    CREATE TABLE IF NOT EXISTS demo_import_observations (
      id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, dictionary_field TEXT NOT NULL,
      created_at TEXT NOT NULL, data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_import_observation_patient_idx ON demo_import_observations(patient_id, id);
    CREATE TABLE IF NOT EXISTS demo_example_batches (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS demo_example_records (
      id INTEGER PRIMARY KEY, import_batch_id INTEGER NOT NULL, source_row_number INTEGER NOT NULL,
      diabetes_label INTEGER NOT NULL, year INTEGER NOT NULL, data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_example_batch_row_idx ON demo_example_records(import_batch_id, source_row_number);
  `);

  const childColumns = db.prepare("PRAGMA table_info(demo_patient_children)").all() as { name: string; pk: number }[];
  if (childColumns.find((column) => column.name === "id")?.pk === 1) {
    db.exec(`
      DROP INDEX IF EXISTS demo_children_patient_kind_idx;
      ALTER TABLE demo_patient_children RENAME TO demo_patient_children_legacy;
      CREATE TABLE demo_patient_children (
        id INTEGER NOT NULL, patient_id INTEGER NOT NULL, kind TEXT NOT NULL, sort_at TEXT NOT NULL,
        data_json TEXT NOT NULL, FOREIGN KEY(patient_id) REFERENCES demo_registered_patients(id),
        PRIMARY KEY(kind, id)
      );
      INSERT OR IGNORE INTO demo_patient_children(id, patient_id, kind, sort_at, data_json)
        SELECT id, patient_id, kind, sort_at, data_json FROM demo_patient_children_legacy;
      DROP TABLE demo_patient_children_legacy;
      CREATE INDEX demo_children_patient_kind_idx ON demo_patient_children(patient_id, kind, sort_at);
    `);
  }
}

function seedDemoData(db: DatabaseHandle) {
  const alreadySeeded = db.prepare("SELECT value FROM demo_meta WHERE key = ?").get("seed-version") as { value: string } | undefined;
  if (alreadySeeded?.value === "2") return;

  const insertPatient = db.prepare(`INSERT OR IGNORE INTO demo_registered_patients
    (id, patient_code, display_name, registration_location, context, archived, updated_at, data_json)
    VALUES (@id, @patientCode, @displayName, @registrationLocation, @context, 0, @updatedAt, @data)`);
  const insertChild = db.prepare(`INSERT OR IGNORE INTO demo_patient_children
    (id, patient_id, kind, sort_at, data_json) VALUES (@id, @patientId, @kind, @sortAt, @data)`);
  const insertImportBatch = db.prepare("INSERT OR IGNORE INTO demo_import_batches(id, created_at, data_json) VALUES (1, ?, ?)");
  const insertImportPatient = db.prepare(`INSERT OR IGNORE INTO demo_import_patients
    (id, import_batch_id, source_row_number, age, identify_by, context, sex, created_at, data_json)
    VALUES (@id, @importBatchId, @sourceRowNumber, @age, @identifyBy, @context, @sex, @createdAt, @data)`);
  const insertObservation = db.prepare(`INSERT OR IGNORE INTO demo_import_observations
    (id, patient_id, dictionary_field, created_at, data_json) VALUES (@id, @patientId, @field, @createdAt, @data)`);
  const insertExampleBatch = db.prepare("INSERT OR IGNORE INTO demo_example_batches(id, created_at, data_json) VALUES (1, ?, ?)");
  const insertExample = db.prepare(`INSERT OR IGNORE INTO demo_example_records
    (id, import_batch_id, source_row_number, diabetes_label, year, data_json) VALUES (@id, 1, @row, @label, @year, @data)`);
  const patientRecords = makePatients();
  const assessments = makeAssessments();
  const media = makeMedia();
  const medications = makeMedication();
  const audits = makeAuditEvents();

  const transaction = db.transaction(() => {
    for (const patient of patientRecords) {
      insertPatient.run({
        id: patient.id,
        patientCode: patient.patientCode,
        displayName: patient.displayName,
        registrationLocation: patient.registrationLocation,
        context: profiles[patient.id - 1].context,
        updatedAt: patient.updatedAt,
        data: json(patient),
      });
    }
    for (const [kind, records] of [
      ["assessment", assessments], ["media", media], ["medication", medications], ["audit", audits],
    ] as const) {
      for (const record of records) {
        insertChild.run({ id: record.id, patientId: record.patientId, kind, sortAt: record.createdAt, data: json(record) });
      }
    }

    const batch = {
      id: 1, sourceFilename: COHORT_FILE, fileSha256: "synthetic-demo-seed-v1",
      sourceRecordCount: imported.length, createdAt: DEMO_DATE,
    };
    insertImportBatch.run(DEMO_DATE, json(batch));
    for (const patient of imported) {
      insertImportPatient.run({
        ...patient,
        data: json({ ...patient, context: undefined, observationCount: 3 }),
      });
      for (const [offset, field, number] of [
        [1, "synthetic_measure_a", 4.5 + patient.id % 8],
        [2, "synthetic_measure_b", 20 + patient.id % 10],
        [3, "synthetic_measure_c", 80 + patient.id % 20],
      ] as const) {
        const observationId = patient.id * 10 + offset;
        const observation = {
          id: observationId, patientId: patient.id, sourceColumn: field, dictionaryField: field,
          periodKey: offset, valueNumber: number, valueText: null, createdAt: patient.createdAt,
        };
        insertObservation.run({ id: observationId, patientId: patient.id, field, createdAt: patient.createdAt, data: json(observation) });
      }
    }

    const exampleBatch = {
      id: 1, sourceFilename: EXAMPLE_FILE, fileSha256: "synthetic-example-seed-v1",
      sourceRecordCount: 8, exactDuplicateGroupCount: 0, exactDuplicateExtraCount: 0,
      mappingVersion: "synthetic-1", status: "synthetic-demo", createdAt: DEMO_DATE,
    };
    insertExampleBatch.run(DEMO_DATE, json(exampleBatch));
    for (let index = 0; index < 8; index += 1) {
      const record = {
        id: index + 1, importBatchId: 1, sourceRowNumber: index + 1,
        rowSha256: `synthetic-hash-${index + 1}`, exactDuplicateGroup: null, isExactDuplicate: false,
        year: 2020 + index, gender: index % 2 ? "Example" : "Demo", age: 35 + index * 4,
        location: "Synthetic Demo Region", raceAfricanAmerican: 0, raceAsian: 0, raceCaucasian: 0,
        raceHispanic: 0, raceOther: 1, hypertension: index % 2, heartDisease: 0,
        smokingHistory: "not-recorded-demo", bmi: 22 + index, hba1cLevel: 5.1 + index * 0.2,
        bloodGlucoseLevel: 80 + index * 7, diabetesLabel: Number(index % 3 === 0),
        clinicalNotes: "Fabricated example record for interface testing only.", createdAt: DEMO_DATE,
      };
      insertExample.run({ id: record.id, row: record.sourceRowNumber, label: record.diabetesLabel, year: record.year, data: json(record) });
    }
    db.prepare("INSERT OR REPLACE INTO demo_meta(key, value) VALUES ('seed-version', '2')").run();
  });
  transaction();
}

export class PublicDemoDatabase {
  private readonly db: DatabaseHandle;

  constructor(filePath: string) {
    if (filePath !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
      if (fs.existsSync(filePath)) fs.chmodSync(filePath, 0o600);
    }
    const writableDb = new Database(filePath);
    writableDb.pragma("journal_mode = DELETE");
    writableDb.pragma("synchronous = FULL");
    writableDb.pragma("busy_timeout = 5000");
    ensureSchema(writableDb);
    seedDemoData(writableDb);
    if (filePath === ":memory:") {
      this.db = writableDb;
    } else {
      writableDb.close();
      fs.chmodSync(filePath, 0o400);
      this.db = new Database(filePath, { readonly: true, fileMustExist: true });
    }
  }

  health() {
    return Number((this.db.prepare("SELECT 1 AS ok").get() as { ok: number }).ok) === 1;
  }

  dashboardSummary(): DashboardSummary {
    const counts = this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM demo_registered_patients WHERE archived = 0) AS patients,
      (SELECT COUNT(*) FROM demo_patient_children WHERE kind = 'assessment') AS assessments,
      (SELECT COUNT(*) FROM demo_patient_children WHERE kind = 'media') AS photos`).get() as { patients: number; assessments: number; photos: number };
    const recentPatients = this.db.prepare("SELECT data_json FROM demo_registered_patients WHERE archived = 0 ORDER BY updated_at DESC, id DESC LIMIT 5").all()
      .map((row) => parse<DashboardSummary["recentPatients"][number]>((row as { data_json: string }).data_json));
    const recentPhotos = this.db.prepare(`SELECT child.data_json, patient.data_json AS patient_json
      FROM demo_patient_children child JOIN demo_registered_patients patient ON patient.id = child.patient_id
      WHERE child.kind = 'media' AND patient.archived = 0 ORDER BY child.sort_at DESC, child.id DESC LIMIT 5`).all()
      .map((row) => {
        const item = row as { data_json: string; patient_json: string };
        const photo = parse<DashboardSummary["recentPhotos"][number]>(item.data_json);
        const patient = parse<{ displayName: string | null; patientCode: string }>(item.patient_json);
        return { ...photo, displayName: patient.displayName, patientCode: patient.patientCode };
      });
    return {
      registeredPatientCount: Number(counts.patients),
      woundAssessmentCount: Number(counts.assessments),
      visiblePhotoCount: Number(counts.photos),
      recentPatients,
      recentPhotos,
    };
  }

  diabetesImportSummary(): ImportSummary {
    const row = this.db.prepare(`SELECT data_json FROM demo_import_batches ORDER BY created_at DESC LIMIT 1`).get() as { data_json: string } | undefined;
    if (!row) return { batch: null, patientCount: 0, observationCount: 0 };
    const batch = parse<NonNullable<ImportSummary["batch"]>>(row.data_json);
    const { patients } = this.db.prepare("SELECT COUNT(*) AS patients FROM demo_import_patients WHERE import_batch_id = ?").get(batch.id) as { patients: number };
    const { observations } = this.db.prepare(`SELECT COUNT(*) AS observations FROM demo_import_observations obs
      JOIN demo_import_patients patient ON patient.id = obs.patient_id WHERE patient.import_batch_id = ?`).get(batch.id) as { observations: number };
    return { batch, patientCount: Number(patients), observationCount: Number(observations) };
  }

  diabetesPatients(limit = 100) {
    return this.importedPatients({ query: "", context: "all", offset: 0, limit }).patients;
  }

  importedPatients(input: { query?: string; context?: string; offset: number; limit: number }): ImportedPage {
    const query = input.query?.trim() ?? "";
    const context = input.context ?? "all";
    const where = ["1 = 1"];
    const params: unknown[] = [];
    if (context !== "all") { where.push("context = ?"); params.push(context); }
    if (query) { where.push("(lower(age) LIKE lower(?) OR lower(identify_by) LIKE lower(?) OR lower(sex) LIKE lower(?))"); params.push(`%${query}%`, `%${query}%`, `%${query}%`); }
    const whereSql = where.join(" AND ");
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM demo_import_patients WHERE ${whereSql}`).get(...params) as { total: number };
    const rows = this.db.prepare(`SELECT data_json FROM demo_import_patients WHERE ${whereSql} ORDER BY source_row_number ASC, id ASC LIMIT ? OFFSET ?`)
      .all(...params, input.limit, input.offset) as { data_json: string }[];
    const patients = rows.map(({ data_json }) => {
      return parse<ImportedPage["patients"][number]>(data_json);
    });
    const total = Number(totalRow.total);
    return { patients, total, hasMore: input.offset + patients.length < total };
  }

  importedPatient(patientId: number): ImportedPatient | null {
    const row = this.db.prepare(`SELECT p.data_json, b.data_json AS batch_json FROM demo_import_patients p
      JOIN demo_import_batches b ON b.id = p.import_batch_id WHERE p.id = ? LIMIT 1`).get(patientId) as { data_json: string; batch_json: string } | undefined;
    if (!row) return null;
    const patient = parse<ImportedPatient>(row.data_json);
    const batch = parse<{ sourceFilename: string }>(row.batch_json);
    return { ...patient, sourceFilename: batch.sourceFilename };
  }

  importedObservations(patientId: number, limit = 24): ImportedObservation[] {
    return (this.db.prepare("SELECT data_json FROM demo_import_observations WHERE patient_id = ? ORDER BY id DESC LIMIT ?")
      .all(patientId, limit) as { data_json: string }[]).map(({ data_json }) => parse<ImportedObservation>(data_json));
  }

  exampleBatches(limit = 20): ExampleBatch[] {
    return (this.db.prepare("SELECT data_json FROM demo_example_batches ORDER BY created_at DESC LIMIT ?").all(limit) as { data_json: string }[])
      .map(({ data_json }) => parse<ExampleBatch>(data_json));
  }

  exampleRecords(batchId: number, offset = 0, limit = 50): ExamplePage {
    const count = this.db.prepare("SELECT COUNT(*) AS total FROM demo_example_records WHERE import_batch_id = ?").get(batchId) as { total: number };
    const records = (this.db.prepare("SELECT data_json FROM demo_example_records WHERE import_batch_id = ? ORDER BY source_row_number ASC LIMIT ? OFFSET ?")
      .all(batchId, limit, offset) as { data_json: string }[]).map(({ data_json }) => parse<ExamplePage["records"][number]>(data_json));
    const total = Number(count.total);
    return { records, total, offset, limit, hasMore: offset + records.length < total };
  }

  registeredPatients(limit = 100) {
    return this.registeredPatientsPage({ query: "", context: "all", offset: 0, limit }).patients;
  }

  registeredPatientsPage(input: { query?: string; context?: string; offset: number; limit: number }): RegisteredPage {
    const query = input.query?.trim() ?? "";
    const context = input.context ?? "all";
    const where = ["archived = 0"];
    const params: unknown[] = [];
    if (context !== "all") { where.push("context = ?"); params.push(context); }
    if (query) {
      where.push("(lower(patient_code) LIKE lower(?) OR lower(display_name) LIKE lower(?) OR lower(registration_location) LIKE lower(?))");
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    const whereSql = where.join(" AND ");
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM demo_registered_patients WHERE ${whereSql}`).get(...params) as { total: number };
    const rows = this.db.prepare(`SELECT data_json FROM demo_registered_patients WHERE ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, input.limit, input.offset) as { data_json: string }[];
    const patients = rows.map(({ data_json }) => {
      const patient = parse<RegisteredPage["patients"][number]>(data_json);
      patient.observationCount = 0;
      return patient;
    });
    const total = Number(totalRow.total);
    return { patients, total, hasMore: input.offset + patients.length < total };
  }

  registeredPatientRecord(patientId: number): RegisteredRecord | null {
    const row = this.db.prepare("SELECT data_json FROM demo_registered_patients WHERE id = ? AND archived = 0 LIMIT 1").get(patientId) as { data_json: string } | undefined;
    if (!row) return null;
    const patient = parse<RegisteredRecord["patient"]>(row.data_json);
    const children = <T,>(kind: string) => (this.db.prepare(`SELECT data_json FROM demo_patient_children WHERE patient_id = ? AND kind = ? ORDER BY sort_at DESC, id DESC LIMIT 100`)
      .all(patientId, kind) as { data_json: string }[]).map(({ data_json }) => parse<T>(data_json));
    const importedObservations = patient.importedPatientId
      ? this.importedObservations(Number(patient.importedPatientId), 500)
      : [];
    return {
      patient,
      medications: children<RegisteredRecord["medications"][number]>("medication"),
      woundAssessments: children<RegisteredRecord["woundAssessments"][number]>("assessment"),
      media: children<RegisteredRecord["media"][number]>("media"),
      auditEvents: children<RegisteredRecord["auditEvents"][number]>("audit"),
      importedObservations,
    };
  }

  photoHistory(input: { query?: string; patientId?: number; from?: Date; to?: Date; limit: number; offset: number }): PhotoHistory {
    const query = input.query?.trim() ?? "";
    const where = ["child.kind = 'media'", "patient.archived = 0"];
    const params: unknown[] = [];
    if (input.patientId) { where.push("patient.id = ?"); params.push(input.patientId); }
    if (input.from) { where.push("child.sort_at >= ?"); params.push(input.from.toISOString()); }
    if (input.to) { where.push("child.sort_at <= ?"); params.push(input.to.toISOString()); }
    if (query) {
      where.push("(lower(patient.patient_code) LIKE lower(?) OR lower(patient.display_name) LIKE lower(?) OR lower(child.data_json) LIKE lower(?))");
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    const whereSql = where.join(" AND ");
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS total FROM demo_patient_children child
      JOIN demo_registered_patients patient ON patient.id = child.patient_id WHERE ${whereSql}`).get(...params) as { total: number };
    const rows = this.db.prepare(`SELECT child.data_json, patient.data_json AS patient_json FROM demo_patient_children child
      JOIN demo_registered_patients patient ON patient.id = child.patient_id WHERE ${whereSql}
      ORDER BY child.sort_at DESC, child.id DESC LIMIT ? OFFSET ?`).all(...params, input.limit, input.offset) as { data_json: string; patient_json: string }[];
    const photos = rows.map(({ data_json, patient_json }) => {
      const photo = parse<PhotoHistory["photos"][number]>(data_json);
      const patient = parse<{ patientCode: string; displayName: string | null; registrationLocation: string }>(patient_json);
      return { ...photo, patientCode: patient.patientCode, displayName: patient.displayName, registrationLocation: patient.registrationLocation };
    });
    const total = Number(totalRow.total);
    return { photos, total, hasMore: input.offset + photos.length < total };
  }

  close() {
    this.db.close();
  }
}

let sharedDatabase: PublicDemoDatabase | null = null;
let sharedPath: string | null = null;

export function getPublicDemoDatabase() {
  const filePath = process.env.SQLITE_DB_PATH?.trim() || "/data/diabcare-demo.sqlite";
  if (!sharedDatabase || sharedPath !== filePath) {
    sharedDatabase?.close();
    sharedDatabase = new PublicDemoDatabase(filePath);
    sharedPath = filePath;
  }
  return sharedDatabase;
}

export function closePublicDemoDatabaseForTests() {
  sharedDatabase?.close();
  sharedDatabase = null;
  sharedPath = null;
}
