import { describe, expect, it } from "vitest";
import { isNavItemActive } from "../shared/navigation";

describe("sidebar navigation route matching", () => {
  it("matches exact routes and nested patient records without false positives", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/patients")).toBe(false);
    expect(isNavItemActive("/patients", "/patients")).toBe(true);
    expect(isNavItemActive("/patients", "/patients/42")).toBe(true);
    expect(isNavItemActive("/patients", "/patients-extra")).toBe(false);
    expect(isNavItemActive("/assessments", "/assessments")).toBe(true);
  });
});
