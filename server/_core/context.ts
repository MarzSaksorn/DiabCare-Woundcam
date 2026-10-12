import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequest } from "./supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export function isLocalAuthBypassEnabled(env: NodeJS.ProcessEnv = process.env) {
  // Local Vite/tsx development has no Supabase session. Production must always
  // use the configured identity provider, even if a stale env var is present.
  if (env.NODE_ENV === "production") return false;
  if (env.DISABLE_LOGIN_PAGE === "true") return true;
  return env.LOCAL_AUTH_BYPASS !== "false";
}

export function createLocalDevelopmentUser(): User {
  const now = new Date();
  return {
    id: 0,
    openId: "local-development-user",
    name: "Local Clinician",
    email: "local@diabcare.local",
    loginMethod: "local-development",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user && isLocalAuthBypassEnabled()) {
    user = createLocalDevelopmentUser();
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
