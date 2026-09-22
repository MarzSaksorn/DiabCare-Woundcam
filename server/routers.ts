import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDiabetesImportSummary, getDiabetesPatients } from "./db";
import { z } from "zod";

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
  }),

});

export type AppRouter = typeof appRouter;
