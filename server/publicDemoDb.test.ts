import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PublicDemoDatabase } from "./publicDemoDb";

describe("PublicDemoDatabase", () => {
  it("seeds synthetic-only registered, imported, wound, media, and example data", () => {
    const db = new PublicDemoDatabase(":memory:");
    try {
      expect(db.health()).toBe(true);
      expect(db.dashboardSummary()).toMatchObject({
        registeredPatientCount: 12,
        woundAssessmentCount: 5,
        visiblePhotoCount: 5,
      });
      expect(db.diabetesImportSummary()).toMatchObject({
        patientCount: 12,
        observationCount: 36,
        batch: { sourceFilename: "synthetic-demo-cohort.json" },
      });
      expect(db.registeredPatientsPage({ context: "type1", offset: 0, limit: 20 }).patients).toHaveLength(3);
      expect(db.registeredPatientsPage({ query: "DEMO-1002", context: "all", offset: 0, limit: 20 }).patients[0]).toMatchObject({
        patientCode: "DEMO-1002",
        displayName: "Sample Patient 02",
        observationCount: 0,
      });
      expect(db.importedPatients({ context: "gdm", offset: 0, limit: 20 }).patients).toHaveLength(1);
      expect(db.importedObservations(101)).toHaveLength(3);
      expect(db.exampleRecords(1).records).toHaveLength(8);

      const record = db.registeredPatientRecord(1);
      expect(record?.patient.patientCode).toBe("DEMO-1001");
      expect(record?.media[0]?.storageUrl).toMatch(/^\/demo-media\/synthetic-wound-example-[a-d]\.svg$/);
      expect(record?.patient.clinicalNotes).toContain("Synthetic interface data only");
      expect(db.photoHistory({ offset: 0, limit: 30 }).total).toBe(5);

      const serialized = JSON.stringify({ summary: db.dashboardSummary(), record });
      expect(serialized).not.toMatch(/supabase|storage\.googleapis/i);
      expect(serialized).toContain("Synthetic");
    } finally {
      db.close();
    }
  });

  it("applies filtering and bounded pagination before returning records", () => {
    const db = new PublicDemoDatabase(":memory:");
    try {
      const page = db.registeredPatientsPage({ query: "Demo Clinic North", context: "all", offset: 1, limit: 2 });
      expect(page.patients).toHaveLength(2);
      expect(page.total).toBe(4);
      expect(page.hasMore).toBe(true);
      expect(page.patients.every((patient) => patient.registrationLocation === "Demo Clinic North")).toBe(true);
    } finally {
      db.close();
    }
  });

  it("seals persistent databases read-only after first-run seeding", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "diabcare-public-demo-"));
    const filePath = path.join(directory, "demo.sqlite");
    const db = new PublicDemoDatabase(filePath);
    try {
      expect(fs.statSync(filePath).mode & 0o777).toBe(0o400);
      const raw = new Database(filePath);
      try {
        expect(() => raw.exec("CREATE TABLE forbidden_write(id INTEGER)")).toThrow(/readonly/i);
      } finally {
        raw.close();
      }
    } finally {
      db.close();
      fs.chmodSync(filePath, 0o600);
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
