import { describe, expect, it } from "vitest";
import {
  createLocalDevelopmentUser,
  isLocalAuthBypassEnabled,
} from "./_core/context";
import { assertProductionConfiguration } from "./_core/env";

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

  it("never bypasses production authentication", () => {
    expect(isLocalAuthBypassEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isLocalAuthBypassEnabled({
        NODE_ENV: "production",
        LOCAL_AUTH_BYPASS: "false",
      })
    ).toBe(false);
    expect(
      isLocalAuthBypassEnabled({
        NODE_ENV: "production",
        LOCAL_AUTH_BYPASS: "true",
      })
    ).toBe(false);
    expect(
      isLocalAuthBypassEnabled({
        NODE_ENV: "development",
        LOCAL_AUTH_BYPASS: "false",
      })
    ).toBe(false);
  });

  it("supports explicitly disabling the login page in development", () => {
    expect(
      isLocalAuthBypassEnabled({
        NODE_ENV: "development",
        LOCAL_AUTH_BYPASS: "false",
        DISABLE_LOGIN_PAGE: "true",
      })
    ).toBe(true);
    expect(
      isLocalAuthBypassEnabled({
        NODE_ENV: "production",
        DISABLE_LOGIN_PAGE: "true",
      })
    ).toBe(false);
  });

  it("rejects an unsafe production startup flag", () => {
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: "production",
        LOCAL_AUTH_BYPASS: "true",
      })
    ).toThrow("forbidden in production");
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: "production",
        DISABLE_LOGIN_PAGE: "true",
      })
    ).toThrow("DISABLE_LOGIN_PAGE=true");
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: "production",
        LOCAL_AUTH_BYPASS: "false",
      })
    ).not.toThrow();
  });
});
