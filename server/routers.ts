import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createRegisteredPatient, getDiabetesExampleBatches, getDiabetesExampleRecords, getDiabetesImportSummary, getDiabetesPatient, getDiabetesPatientObservations, getDiabetesPatients, getRegisteredPatients } from "./db";
import { z } from "zod";
import { inferWoundImage } from "./woundInference";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  diabetes: router({
    summary: protectedProcedure.query(() => getDiabetesImportSummary()),
    patients: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) })).query(({ input }) => getDiabetesPatients(input.limit)),
    detail: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).query(({ input }) => getDiabetesPatient(input.patientId)),
    observations: protectedProcedure.input(z.object({ patientId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(24) })).query(({ input }) => getDiabetesPatientObservations(input.patientId, input.limit)),
    exampleBatches: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(20).default(20) })).query(({ input }) => getDiabetesExampleBatches(input.limit)),
    exampleRecords: protectedProcedure.input(z.object({ batchId: z.number().int().positive(), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(100).default(50) })).query(({ input }) => getDiabetesExampleRecords(input.batchId, input.offset, input.limit)),
    registeredPatients: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) })).query(({ input }) => getRegisteredPatients(input.limit)),
    registerPatient: protectedProcedure.input(z.object({
      patientCode: z.string().trim().min(2).max(64),
      displayName: z.string().trim().max(160).optional(),
      phone: z.string().trim().max(32).optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      age: z.number().int().min(0).max(150).optional(),
      registrationLocation: z.string().trim().min(2).max(160),
      identifyBy: z.string().trim().min(2).max(32),
      type1: z.union([z.literal(0), z.literal(1)]).default(0),
      type2: z.union([z.literal(0), z.literal(1)]).default(0),
      gdm: z.union([z.literal(0), z.literal(1)]).default(0),
      sex: z.enum(["FEMALE", "MALE"]),
      clinicalNotes: z.string().trim().max(4000).optional(),
    }).refine((input) => input.age !== undefined || input.dateOfBirth !== undefined, { message: "Age or date of birth is required", path: ["age"] }).refine((input) => input.type1 + input.type2 + input.gdm <= 1, { message: "Choose only one diabetes context", path: ["type2"] })).mutation(async ({ input, ctx }) => {
      try {
        return await createRegisteredPatient({ ...input, createdByUserId: ctx.user && ctx.user.id > 0 ? ctx.user.id : null });
      } catch (error) {
        if (error instanceof Error && error.message.includes("registered_patients_patient_code_key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A patient with this local code already exists" });
        }
        throw error;
      }
    }),
  }),

  wound: router({
    infer: protectedProcedure.input(z.object({ imageData: z.string().min(32).max(16_000_000), confidence: z.number().min(0.05).max(0.95).default(0.25) })).mutation(async ({ input }) => {
      const payload = input.imageData.includes(",") ? input.imageData.split(",", 2)[1] : input.imageData;
      if (!payload) throw new Error("Image payload is empty");
      const image = Buffer.from(payload, "base64");
      if (image.byteLength > 12 * 1024 * 1024) throw new Error("Image is too large");
      return inferWoundImage(image, input.confidence);
    }),
  }),

});

export type AppRouter = typeof appRouter;
