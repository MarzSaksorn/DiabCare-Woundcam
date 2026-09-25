import { describe, expect, it } from "vitest";
import { createLocalDevelopmentUser } from "./_core/context";
import { appRouter } from "./routers";

describe("Supabase-backed diabetes API", () => {
  it("reports the removed imported datasets through the protected API procedure", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const [summary, patients] = await Promise.all([
      caller.diabetes.summary(),
      caller.diabetes.patients({ limit: 1 }),
    ]);

    expect(summary.batch).toBeNull();
    expect(summary.patientCount).toBe(0);
    expect(summary.observationCount).toBe(0);
    expect(patients).toHaveLength(0);
  }, 20_000);

  it("reports the removed example cohort as empty", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const batches = await caller.diabetes.exampleBatches({ limit: 5 });
    expect(batches).toHaveLength(0);
  }, 20_000);

  it("serves registered patients through the protected collection procedure", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const registered = await caller.diabetes.registeredPatients({ limit: 1 });
    expect(Array.isArray(registered)).toBe(true);
    if (registered[0]) expect(registered[0]).not.toHaveProperty("clinicalNotes");
  }, 20_000);

  it("includes wound-photo history in a registered patient record", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const registered = await caller.diabetes.registeredPatients({ limit: 1 });
    if (!registered[0]) return;
    const record = await caller.diabetes.registeredPatientRecord({ patientId: registered[0].id });
    expect(Array.isArray(record?.media)).toBe(true);
  }, 20_000);

  it("supports filtered diagnostic capture history", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: createLocalDevelopmentUser(),
    });

    const history = await caller.diabetes.photoHistory({ offset: 0, limit: 10 });
    expect(history.total).toBeGreaterThanOrEqual(0);
    expect(history.photos.length).toBeLessThanOrEqual(10);
    expect(typeof history.hasMore).toBe("boolean");
  }, 20_000);
});
