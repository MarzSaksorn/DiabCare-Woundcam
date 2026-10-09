import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { ENV } from "./env";
import { getCombinedModelReadiness } from "../woundInference";
import { sql } from "drizzle-orm";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(async () => {
      let database = false;
      const db = await getDb();
      if (db) {
        try {
          await db.execute(sql`select 1`);
          database = true;
        } catch {
          database = false;
        }
      }
      const storage = Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
      const models = getCombinedModelReadiness();
      return { ok: database && storage && models.detector.available, dependencies: { database, storage, model: models.detector, classifier: models.classifier } } as const;
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
