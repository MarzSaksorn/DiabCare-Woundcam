import { describe, expect, it } from "vitest";
import { getMissingTranslationKeys, translationKeys } from "../client/src/contexts/LanguageContext";
import { formatDate, formatMeasurementPair, formatNumber, formatPercent } from "../client/src/lib/locale";

describe("clinical translation coverage", () => {
  it("has a non-empty English and Thai value for every registered UI key", () => {
    expect(translationKeys.length).toBeGreaterThan(100);
    expect(getMissingTranslationKeys("en")).toEqual([]);
    expect(getMissingTranslationKeys("th")).toEqual([]);
  });

  it("does not leave the clinical safety and assessment workflow keys untranslated", () => {
    const requiredKeys = ["decisionSupport", "clinicalDisclaimer", "observedStage", "reviewDate", "woundImage", "clinicalNote", "saveAssessment", "importedBaseline"];
    for (const key of requiredKeys) expect(translationKeys).toContain(key);
  });

  it("formats clinical values with the selected locale", () => {
    expect(formatNumber(12345, "en")).toBe("12,345");
    expect(formatPercent(68, "en")).toBe("68%");
    expect(formatMeasurementPair(2.4, 1.8, "cm", "en")).toBe("2.4 × 1.8 cm");
    expect(formatDate("2026-09-17T00:00:00Z", "th")).toContain("2569");
  });
});
