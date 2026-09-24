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
});
