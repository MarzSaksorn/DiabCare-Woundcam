import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createPublicDemoUser, type TrpcContext } from "./_core/context";

describe("public demo access controls", () => {
  it("rejects patient writes before any database function can run", async () => {
    const ctx = {
      req: {} as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
      user: createPublicDemoUser(),
      publicDemo: true,
    } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.diabetes.registerPatient({
      patientCode: "ATTEMPT-001",
      registrationLocation: "Demo Clinic",
      identifyBy: "Synthetic demo identifier",
      age: 50,
      sex: "FEMALE",
      type1: 0,
      type2: 1,
      gdm: 0,
    })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This public demo is read-only. Changes are disabled.",
    });
  });
});
