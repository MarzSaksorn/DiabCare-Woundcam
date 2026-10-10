import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  InconclusiveInferenceState,
  RegionAnalysisList,
} from "./WoundInferenceResults";

const detection = {
  label: "dfu_ulcer",
  confidence: 0.82,
  box: { x: 12, y: 24, width: 180, height: 140 },
};
const probabilities = { BG: 0.1, D: 0.4, N: 0.2, P: 0.1, S: 0.1, V: 0.1 };

describe("wound inference result presentation", () => {
  it("renders detector and AZH outputs as separate taxonomies with all six probabilities", () => {
    const markup = renderToStaticMarkup(
      <RegionAnalysisList
        language="en"
        regions={[
          {
            detection,
            classification: {
              status: "ok",
              model: "azh-classifier",
              code: "D",
              name: "Diabetic wound",
              confidence: 0.4,
              probabilities,
            },
            reviewRequired: true,
          },
        ]}
      />
    );

    expect(markup).toContain("dfu ulcer");
    expect(markup).toContain("AZH classifier");
    expect(markup).toContain("D · Diabetic wound");
    expect(markup).toContain("Separate taxonomies");
    for (const code of ["BG", "D", "N", "P", "S", "V"])
      expect(markup).toContain(code);
    expect(markup).toContain("Review required");
    expect(markup).toContain("Not a diagnosis");
  });

  it("renders unavailable and error states without merging model labels", () => {
    const markup = renderToStaticMarkup(
      <RegionAnalysisList
        language="en"
        regions={[
          {
            detection,
            classification: {
              status: "unavailable",
              model: "azh-classifier",
              reason: "AZH classifier is disabled.",
            },
            reviewRequired: true,
          },
          {
            detection: { ...detection, label: "infected_wound" },
            classification: {
              status: "error",
              model: "azh-classifier",
              reason: "AZH classifier could not analyze this region.",
            },
            reviewRequired: true,
          },
        ]}
      />
    );

    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Error");
    expect(markup).toContain("infected wound");
    expect(markup).not.toContain("infected diabetic wound");
    expect((markup.match(/Review required/g) ?? []).length).toBe(2);
  });

  it("renders an explicit inconclusive state when no detector region is available", () => {
    const markup = renderToStaticMarkup(
      <InconclusiveInferenceState
        language="en"
        disclaimer="Model suggestion only; clinician review required."
      />
    );
    expect(markup).toContain("Inconclusive");
    expect(markup).toContain("found no qualifying region");
    expect(markup).toContain("full image");
  });
});
