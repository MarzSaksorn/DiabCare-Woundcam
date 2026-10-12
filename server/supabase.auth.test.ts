import { describe, expect, it } from "vitest";
import { getPublicSupabaseConfig } from "./_core/supabaseAuth";

describe("Supabase Auth runtime configuration", () => {
  it("accepts a Supabase URL and publishable key", () => {
    expect(
      getPublicSupabaseConfig({
        NODE_ENV: "production",
        SUPABASE_URL: "https://gpxgyvjoamwyrbswljyj.supabase.co/",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      })
    ).toEqual({
      supabaseUrl: "https://gpxgyvjoamwyrbswljyj.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
      configured: true,
    });
  });

  it("rejects missing, insecure, and privileged keys", () => {
    expect(getPublicSupabaseConfig({}).configured).toBe(false);
    expect(
      getPublicSupabaseConfig({
        NODE_ENV: "production",
        SUPABASE_URL: "http://internal.example.com",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }).configured
    ).toBe(false);
    expect(
      getPublicSupabaseConfig({
        NODE_ENV: "production",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_do_not_expose",
      })
    ).toMatchObject({ configured: false, supabasePublishableKey: "" });
  });

  it("allows localhost HTTP only outside production", () => {
    expect(
      getPublicSupabaseConfig({
        NODE_ENV: "development",
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local",
      }).configured
    ).toBe(true);
    expect(
      getPublicSupabaseConfig({
        NODE_ENV: "production",
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local",
      }).configured
    ).toBe(false);
  });
});
