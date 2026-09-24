import { describe, expect, it } from "vitest";
import { createLocalDevelopmentUser } from "./_core/context";
import { appRouter } from "./routers";

describe("Supabase-backed diabetes API", () => {
  it("serves summary and patient rows through the protected API procedure", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const [summary, patients] = await Promise.all([
      caller.diabetes.summary(),
      caller.diabetes.patients({ limit: 1 }),
    ]);

    expect(summary.batch).not.toBeNull();
    expect(summary.patientCount).toBeGreaterThan(0);
    expect(summary.observationCount).toBeGreaterThan(0);
    expect(patients).toHaveLength(1);
    expect(patients[0]?.id).toBeGreaterThan(0);
  }, 20_000);

  it("serves the isolated example cohort through bounded batch pagination", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const batches = await caller.diabetes.exampleBatches({ limit: 5 });
    expect(batches).toHaveLength(1);
    expect(batches[0]?.status).toBe("imported");
    expect(batches[0]?.sourceRecordCount).toBe(100_000);
    expect(batches[0]?.exactDuplicateExtraCount).toBe(14);

    const page = await caller.diabetes.exampleRecords({ batchId: batches[0]!.id, offset: 0, limit: 3 });
    expect(page.total).toBe(100_000);
    expect(page.records).toHaveLength(3);
    expect(page.records[0]?.sourceRowNumber).toBe(2);
    expect(page.records[0]).not.toHaveProperty("clinicalNotes");
    expect(page.hasMore).toBe(true);
  }, 20_000);
});
