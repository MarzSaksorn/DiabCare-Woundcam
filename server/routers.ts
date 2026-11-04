import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedMutationProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addPatientMedication, addPatientWoundAssessment, addPatientWoundMedia, archiveRegisteredPatient, createRegisteredPatient, deletePatientWoundMedia, exportRegisteredPatient, getClinicalDashboardSummary, getDiabetesExampleBatches, getDiabetesExampleRecords, getDiabetesImportSummary, getDiabetesPatient, getDiabetesPatientObservations, getDiabetesPatients, getDiabetesPatientsPage, getRegisteredPatientRecord, getRegisteredPatients, getRegisteredPatientsPage, getWoundPhotoHistory, restoreRegisteredPatient, setPatientWoundMediaHidden, updateRegisteredPatient } from "./db";
import { z } from "zod";
import { getPublicDemoDatabase } from "./publicDemoDb";

const publicDemoEnabled = () => process.env.PUBLIC_DEMO_MODE === "true";
import { inferWoundImage } from "./woundInference";
import { TRPCError } from "@trpc/server";
import sharp from "sharp";

const DEMO_INFERENCE_WINDOW_MS = 60_000;
const DEMO_INFERENCE_MAX_PER_WINDOW = 12;
let demoInferenceWindowStartedAt = 0;
let demoInferenceRequestCount = 0;
let demoInferenceInFlight = false;

function reservePublicDemoInference() {
  const now = Date.now();
  if (now - demoInferenceWindowStartedAt >= DEMO_INFERENCE_WINDOW_MS) {
    demoInferenceWindowStartedAt = now;
    demoInferenceRequestCount = 0;
  }
  if (demoInferenceInFlight || demoInferenceRequestCount >= DEMO_INFERENCE_MAX_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "The public demo is busy. Please wait before trying another image.",
    });
  }
  demoInferenceRequestCount += 1;
  demoInferenceInFlight = true;
}

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

  dashboard: router({
    summary: protectedProcedure.query(() => publicDemoEnabled() ? getPublicDemoDatabase().dashboardSummary() : getClinicalDashboardSummary()),
  }),

  diabetes: router({
    summary: protectedProcedure.query(() => publicDemoEnabled() ? getPublicDemoDatabase().diabetesImportSummary() : getDiabetesImportSummary()),
    patients: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().diabetesPatients(input.limit) : getDiabetesPatients(input.limit)),
    patientsPage: protectedProcedure.input(z.object({ query: z.string().trim().max(160).default(""), context: z.enum(["all", "type1", "type2", "gdm"]).default("all"), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(100).default(20) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().importedPatients(input) : getDiabetesPatientsPage(input)),
    detail: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().importedPatient(input.patientId) : getDiabetesPatient(input.patientId)),
    observations: protectedProcedure.input(z.object({ patientId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(24) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().importedObservations(input.patientId, input.limit) : getDiabetesPatientObservations(input.patientId, input.limit)),
    exampleBatches: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(20).default(20) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().exampleBatches(input.limit) : getDiabetesExampleBatches(input.limit)),
    exampleRecords: protectedProcedure.input(z.object({ batchId: z.number().int().positive(), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(100).default(50) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().exampleRecords(input.batchId, input.offset, input.limit) : getDiabetesExampleRecords(input.batchId, input.offset, input.limit)),
    registeredPatients: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().registeredPatients(input.limit) : getRegisteredPatients(input.limit)),
    registeredPatientsPage: protectedProcedure.input(z.object({ query: z.string().trim().max(160).default(""), context: z.enum(["all", "type1", "type2", "gdm"]).default("all"), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(100).default(20) })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().registeredPatientsPage(input) : getRegisteredPatientsPage(input)),
    registeredPatientRecord: protectedProcedure.input(z.object({ patientId: z.number().int().positive() })).query(({ input }) => publicDemoEnabled() ? getPublicDemoDatabase().registeredPatientRecord(input.patientId) : getRegisteredPatientRecord(input.patientId)),
    photoHistory: protectedProcedure.input(z.object({ query: z.string().trim().max(160).default(""), patientId: z.number().int().positive().optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(100).default(30) })).query(({ input }) => { const filter = { query: input.query, patientId: input.patientId, from: input.from ? new Date(`${input.from}T00:00:00`) : undefined, to: input.to ? new Date(`${input.to}T23:59:59.999`) : undefined, offset: input.offset, limit: input.limit }; return publicDemoEnabled() ? getPublicDemoDatabase().photoHistory(filter) : getWoundPhotoHistory(filter); }),
    registerPatient: protectedMutationProcedure.input(z.object({
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
    updateRegisteredPatient: protectedMutationProcedure.input(z.object({
      patientId: z.number().int().positive(), displayName: z.string().trim().max(160).nullable().optional(), phone: z.string().trim().max(32).nullable().optional(), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), age: z.number().int().min(0).max(150).nullable().optional(), registrationLocation: z.string().trim().min(2).max(160), identifyBy: z.string().trim().min(2).max(32), type1: z.union([z.literal(0), z.literal(1)]), type2: z.union([z.literal(0), z.literal(1)]), gdm: z.union([z.literal(0), z.literal(1)]), sex: z.enum(["FEMALE", "MALE"]), clinicalNotes: z.string().trim().max(4000).nullable().optional(), allergiesSummary: z.string().trim().max(4000).nullable().optional(), diagnosesSummary: z.string().trim().max(4000).nullable().optional(), riskFlags: z.string().trim().max(4000).nullable().optional(), careTeam: z.string().trim().max(4000).nullable().optional(),
    }).refine((input) => input.age !== null || input.dateOfBirth !== null, { message: "Age or date of birth is required", path: ["age"] })).mutation(({ input, ctx }) => updateRegisteredPatient(input.patientId, { displayName: input.displayName, phone: input.phone, dateOfBirth: input.dateOfBirth, age: input.age, registrationLocation: input.registrationLocation, identifyBy: input.identifyBy, type1: input.type1, type2: input.type2, gdm: input.gdm, sex: input.sex, clinicalNotes: input.clinicalNotes, allergiesSummary: input.allergiesSummary, diagnosesSummary: input.diagnosesSummary, riskFlags: input.riskFlags, careTeam: input.careTeam }, ctx.user && ctx.user.id > 0 ? ctx.user.id : null)),
    addMedication: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive(), medicationName: z.string().trim().min(2).max(160), dose: z.string().trim().max(80).optional(), route: z.string().trim().max(80).optional(), frequency: z.string().trim().max(120).optional(), startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), status: z.enum(["active", "paused", "stopped", "completed"]), notes: z.string().trim().max(4000).optional() })).mutation(({ input, ctx }) => addPatientMedication({ ...input, recordedByUserId: ctx.user && ctx.user.id > 0 ? ctx.user.id : null })),
    addWoundAssessment: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive(), woundLabel: z.string().trim().min(2).max(160), location: z.string().trim().min(2).max(160), assessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), classification: z.string().trim().max(80).optional(), lengthCm: z.number().min(0).max(1000).optional(), widthCm: z.number().min(0).max(1000).optional(), depthCm: z.number().min(0).max(1000).optional(), tissueCharacteristics: z.string().trim().max(4000).optional(), drainage: z.string().trim().max(80).optional(), odor: z.string().trim().max(80).optional(), painScore: z.number().int().min(0).max(10).optional(), infectionIndicators: z.string().trim().max(4000).optional(), treatmentPlan: z.string().trim().max(4000).optional(), clinicianNotes: z.string().trim().max(4000).optional(), mediaReference: z.string().trim().max(1000).optional() })).mutation(({ input, ctx }) => addPatientWoundAssessment({ ...input, recordedByUserId: ctx.user && ctx.user.id > 0 ? ctx.user.id : null })),
    uploadWoundPhoto: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive(), woundAssessmentId: z.number().int().positive().nullable().optional(), fileName: z.string().trim().min(1).max(240), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), capturedAt: z.string().min(16).max(40), caption: z.string().trim().max(500).nullable().optional(), imageData: z.string().min(32).max(16_800_000) })).mutation(async ({ input, ctx }) => {
      const payload = input.imageData.includes(",") ? input.imageData.split(",", 2)[1] : input.imageData;
      const imageBuffer = Buffer.from(payload, "base64");
      if (!imageBuffer.length || imageBuffer.length > 12 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Photo must be smaller than 12 MB" });
      let actualMimeType: "image/jpeg" | "image/png" | "image/webp";
      try {
        const format = (await sharp(imageBuffer, { failOn: "error" }).metadata()).format;
        if (format !== "jpeg" && format !== "png" && format !== "webp") throw new Error("unsupported image format");
        actualMimeType = format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Photo bytes are not a valid JPEG, PNG, or WebP image" });
      }
      if (actualMimeType !== input.mimeType) throw new TRPCError({ code: "BAD_REQUEST", message: "Photo MIME type does not match its file bytes" });
      const capturedAt = new Date(input.capturedAt);
      if (Number.isNaN(capturedAt.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Photo date and time is invalid" });
      return addPatientWoundMedia({ patientId: input.patientId, woundAssessmentId: input.woundAssessmentId ?? null, fileName: input.fileName, mimeType: input.mimeType, fileSizeBytes: imageBuffer.length, capturedOn: capturedAt.toISOString().slice(0, 10), capturedAt, caption: input.caption ?? null, recordedByUserId: ctx.user && ctx.user.id > 0 ? ctx.user.id : null, imageBuffer });
    }),
    setWoundPhotoVisibility: protectedMutationProcedure.input(z.object({ mediaId: z.number().int().positive(), hidden: z.boolean(), reason: z.string().trim().max(500).optional() })).mutation(({ input, ctx }) => setPatientWoundMediaHidden(input.mediaId, input.hidden, ctx.user && ctx.user.id > 0 ? ctx.user.id : null, input.reason)),
    deleteWoundPhoto: protectedMutationProcedure.input(z.object({ mediaId: z.number().int().positive() })).mutation(({ input, ctx }) => deletePatientWoundMedia(input.mediaId, ctx.user && ctx.user.id > 0 ? ctx.user.id : null)),
    archivePatient: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive(), reason: z.string().trim().min(2).max(500) })).mutation(({ input, ctx }) => archiveRegisteredPatient(input.patientId, ctx.user && ctx.user.id > 0 ? ctx.user.id : null, input.reason)),
    restorePatient: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive() })).mutation(({ input, ctx }) => restoreRegisteredPatient(input.patientId, ctx.user && ctx.user.id > 0 ? ctx.user.id : null)),
    exportPatient: protectedMutationProcedure.input(z.object({ patientId: z.number().int().positive() })).mutation(({ input, ctx }) => exportRegisteredPatient(input.patientId, ctx.user && ctx.user.id > 0 ? ctx.user.id : null)),
  }),

  wound: router({
    infer: protectedProcedure.input(z.object({ imageData: z.string().min(32).max(16_000_000), confidence: z.number().min(0.05).max(0.95).default(0.25) })).mutation(async ({ input, ctx }) => {
      const payload = input.imageData.includes(",") ? input.imageData.split(",", 2)[1] : input.imageData;
      if (!payload) throw new TRPCError({ code: "BAD_REQUEST", message: "Image payload is empty" });
      const image = Buffer.from(payload, "base64");
      if (!image.byteLength || image.byteLength > 12 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be smaller than 12 MB" });
      }
      if (ctx.publicDemo) reservePublicDemoInference();
      try {
        return await inferWoundImage(image, input.confidence);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: "The selected image could not be analyzed" });
      } finally {
        if (ctx.publicDemo) demoInferenceInFlight = false;
      }
    }),
  }),

});

export type AppRouter = typeof appRouter;
