import { describe, expect, it } from "vitest";
import { getMissingTranslationKeys, translationKeys } from "../client/src/contexts/LanguageContext";

describe("diagnostic camera workflow", () => {
  it("keeps the camera workflow copy available in English and Thai", () => {
    const requiredKeys = [
      "cameraTitle",
      "cameraSubtitle",
      "captureImage",
      "openCamera",
      "reviewBeforeAnalysis",
      "diagnosticDisclaimer",
      "clinicalDecision",
    ];

    expect(requiredKeys.every((key) => translationKeys.includes(key))).toBe(true);
    expect(getMissingTranslationKeys("en")).toEqual([]);
    expect(getMissingTranslationKeys("th")).toEqual([]);
  });
});
