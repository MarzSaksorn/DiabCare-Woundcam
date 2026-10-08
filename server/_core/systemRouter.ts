import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { ENV } from "./env";
import { getWoundModelReadiness } from "../woundInference";
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
      const model = getWoundModelReadiness();
      return { ok: database && storage && model.available, dependencies: { database, storage, model } } as const;
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
