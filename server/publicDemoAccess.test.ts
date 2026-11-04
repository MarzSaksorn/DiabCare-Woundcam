import { describe, expect, it, vi } from "vitest";
const { mockInferWoundImage } = vi.hoisted(() => ({ mockInferWoundImage: vi.fn() }));
vi.mock("./woundInference", () => ({ inferWoundImage: mockInferWoundImage }));
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

  it("allows demo visitors to run in-memory wound inference without enabling record writes", async () => {
    const result = { model: "diabetes-wound-detector", detections: [], regions: [] };
    mockInferWoundImage.mockResolvedValueOnce(result);
    const ctx = {
      req: {} as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
      user: createPublicDemoUser(),
      publicDemo: true,
    } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.wound.infer({
      imageData: "data:image/jpeg;base64,YWJjZGVmZ2hpamtsbW5vcA==",
      confidence: 0.25,
    })).resolves.toMatchObject(result);
    expect(mockInferWoundImage).toHaveBeenCalledOnce();
    expect(mockInferWoundImage.mock.calls[0]?.[0]).toBeInstanceOf(Buffer);
  });
});
