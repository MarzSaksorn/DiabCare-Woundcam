import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  configured: boolean;
};

let clientPromise: Promise<SupabaseClient> | null = null;

async function loadConfig(): Promise<PublicSupabaseConfig> {
  let response: Response;
  try {
    response = await fetch("/api/auth/config", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    throw new Error(
      "Can't reach the Supabase Auth service. Check your connection and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Supabase Auth settings couldn't be loaded (${response.status}).`
    );
  }

  const config = (await response.json()) as PublicSupabaseConfig;
  if (
    !config.configured ||
    !config.supabaseUrl ||
    !config.supabasePublishableKey
  ) {
    throw new Error(
      "Supabase Auth isn't configured yet. Ask the administrator to set SUPABASE_URL and a publishable key."
    );
  }
  return config;
}

export function getSupabaseClient(): Promise<SupabaseClient> {
  clientPromise ??= loadConfig()
    .then(config =>
      createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
        },
      })
    )
    .catch(error => {
      clientPromise = null;
      throw error;
    });
  return clientPromise;
}
