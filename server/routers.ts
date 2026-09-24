import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDiabetesImportSummary, getDiabetesPatient, getDiabetesPatientObservations, getDiabetesPatients } from "./db";
import { z } from "zod";
import { inferWoundImage } from "./woundInference";

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
