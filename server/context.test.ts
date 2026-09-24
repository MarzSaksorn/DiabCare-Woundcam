import { describe, expect, it } from "vitest";
import { createLocalDevelopmentUser, isLocalAuthBypassEnabled } from "./_core/context";

describe("local authentication mode", () => {
  it("enables the synthetic user by default in development", () => {
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(createLocalDevelopmentUser()).toMatchObject({
      id: 0,
      openId: "local-development-user",
      name: "Local Clinician",
      loginMethod: "local-development",
      role: "admin",
    });
  });

  it("does not bypass production authentication unless explicitly enabled", () => {
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "production", LOCAL_AUTH_BYPASS: "false" })).toBe(false);
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "production", LOCAL_AUTH_BYPASS: "true" })).toBe(true);
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "development", LOCAL_AUTH_BYPASS: "false" })).toBe(false);
  });
});
