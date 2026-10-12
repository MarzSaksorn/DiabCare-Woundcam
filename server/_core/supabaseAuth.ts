import {
  createClient,
  type SupabaseClient,
  type User as SupabaseAuthUser,
} from "@supabase/supabase-js";
import type { Express, Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { ForbiddenError } from "@shared/_core/errors";
import * as db from "../db";
import { ENV } from "./env";

type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  configured: boolean;
};

let authClient: SupabaseClient | null = null;

function decodeJwtPayload(value: string): Record<string, unknown> | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  try {
    const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function isPublishableSupabaseKey(value: string): boolean {
  if (value.startsWith("sb_publishable_")) return true;
  return decodeJwtPayload(value)?.role === "anon";
}

function isAllowedSupabaseUrl(value: string, env: NodeJS.ProcessEnv): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    if (env.NODE_ENV === "production") return false;
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function getPublicSupabaseConfig(
  env: NodeJS.ProcessEnv = process.env
): PublicSupabaseConfig {
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/+$/, "") ?? "";
  const candidateKey =
    env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim() ||
    env.SUPABASE_KEY?.trim() ||
    "";
  const supabasePublishableKey = isPublishableSupabaseKey(candidateKey)
    ? candidateKey
    : "";

  return {
    supabaseUrl,
    supabasePublishableKey,
    configured: Boolean(
      supabaseUrl &&
        supabasePublishableKey &&
        isAllowedSupabaseUrl(supabaseUrl, env)
    ),
  };
}

function getSupabaseAuthClient(): SupabaseClient {
  if (authClient) return authClient;

  const config = getPublicSupabaseConfig({
    NODE_ENV: ENV.isProduction ? "production" : "development",
    SUPABASE_URL: ENV.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: ENV.supabasePublishableKey,
  });
  if (!config.configured) {
    throw new Error(
      "Supabase Auth is not configured: set SUPABASE_URL and a publishable SUPABASE_PUBLISHABLE_KEY"
    );
  }

  authClient = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return authClient;
}

function getDisplayName(user: SupabaseAuthUser): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  for (const key of ["full_name", "name", "display_name"]) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return user.email ?? null;
}

export async function authenticateSupabaseRequest(req: Request): Promise<User> {
  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

  if (!accessToken) {
    throw ForbiddenError("Authentication required");
  }

  let user: SupabaseAuthUser | null = null;
  try {
    const result = await getSupabaseAuthClient().auth.getUser(accessToken);
    user = result.data.user;
    if (result.error || !user) {
      throw result.error ?? new Error("Supabase returned no user");
    }
  } catch (error) {
    console.error("[Supabase Auth] Failed to verify access token:", error);
    throw ForbiddenError("Invalid Supabase access token");
  }

  const signedInAt = new Date();
  await db.upsertUser({
    openId: user.id,
    name: getDisplayName(user),
    email: user.email ?? null,
    loginMethod: "supabase-email",
    lastSignedIn: signedInAt,
  });

  const applicationUser = await db.getUserByOpenId(user.id);
  if (!applicationUser) {
    throw ForbiddenError("Application user is not available");
  }

  return applicationUser;
}

export function registerSupabaseAuthRoutes(app: Express) {
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    const config = getPublicSupabaseConfig();
    res.set("Cache-Control", "no-store").json(config);
  });
}
