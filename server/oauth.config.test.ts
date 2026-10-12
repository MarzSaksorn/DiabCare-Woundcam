import { describe, expect, it } from "vitest";
import { getPublicOAuthConfig } from "./_core/oauth";

describe("public OAuth runtime configuration", () => {
  it("accepts a registered app ID and HTTPS portal URL", () => {
    expect(
      getPublicOAuthConfig({
        VITE_APP_ID: "registered-app",
        VITE_OAUTH_PORTAL_URL: "https://login.example.org/",
        OAUTH_SERVER_URL: "https://api.example.org",
        JWT_SECRET: "must-not-be-returned",
      })
    ).toEqual({
      appId: "registered-app",
      oauthPortalUrl: "https://login.example.org",
      configured: true,
    });
  });

  it("does not mark missing or non-HTTPS settings as configured", () => {
    expect(getPublicOAuthConfig({}).configured).toBe(false);
    expect(
      getPublicOAuthConfig({
        VITE_APP_ID: "registered-app",
        VITE_OAUTH_PORTAL_URL: "http://login.example.org",
        OAUTH_SERVER_URL: "https://api.example.org",
        JWT_SECRET: "test-secret",
      }).configured
    ).toBe(false);
    expect(
      getPublicOAuthConfig({
        VITE_APP_ID: "local-development",
        VITE_OAUTH_PORTAL_URL: "https://login.example.org",
        OAUTH_SERVER_URL: "https://api.example.org",
        JWT_SECRET: "test-secret",
      }).configured
    ).toBe(false);
    expect(
      getPublicOAuthConfig({
        VITE_APP_ID: "registered-app",
        VITE_OAUTH_PORTAL_URL: "https://login.example.org",
      }).configured
    ).toBe(false);
  });
});
