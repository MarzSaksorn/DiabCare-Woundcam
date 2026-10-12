import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DetectionOverlay,
  InconclusiveInferenceState,
  OverlayControls,
  RegionAnalysisList,
  type RegionAnalysis,
} from "./WoundInferenceResults";

const detection = {
  label: "dfu_ulcer",
  confidence: 0.82,
  box: { x: 12, y: 24, width: 180, height: 140 },
};
const probabilities = { BG: 0.1, D: 0.4, N: 0.2, P: 0.1, S: 0.1, V: 0.1 };
const mask = {
  width: 128 as const,
  height: 128 as const,
  encoding: "png-base64" as const,
  data: "AA==",
};
const segmentationOk = {
  status: "ok" as const,
  model: "wound-segmentation" as const,
  threshold: 0.5,
  woundPixelFraction: 0.184,
  mask,
};
const segmentationUnavailable = {
  status: "unavailable" as const,
  model: "wound-segmentation" as const,
  reason: "Wound segmentation is disabled.",
};

function region(overrides: Partial<RegionAnalysis> = {}): RegionAnalysis {
  return {
    detection,
    classification: {
      status: "ok",
      model: "azh-classifier",
      code: "D",
      name: "Diabetic wound",
      confidence: 0.4,
      probabilities,
    },
    segmentation: segmentationOk,
    reviewRequired: true,
    ...overrides,
  };
}

describe("wound inference result presentation", () => {
  it("renders detector, AZH, and segmentation outputs as separate sections", () => {
    const markup = renderToStaticMarkup(
      <RegionAnalysisList language="en" regions={[region()]} />
    );
    expect(markup).toContain("dfu ulcer");
    expect(markup).toContain("AZH classifier");
    expect(markup).toContain("D · Diabetic wound");
    expect(markup).toContain("Wound-area segmentation");
    expect(markup).toContain("Mask available");
    expect(markup).toContain("Threshold 50%");
    expect(markup).toContain(
      "Predicted mask coverage: 18.4% of this detector crop"
    );
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
          region({
            classification: {
              status: "unavailable",
              model: "azh-classifier",
              reason: "AZH classifier is disabled.",
            },
            segmentation: segmentationUnavailable,
          }),
          region({
            detection: { ...detection, label: "infected_wound" },
            classification: {
              status: "error",
              model: "azh-classifier",
              reason: "AZH classifier could not analyze this region.",
            },
            segmentation: {
              status: "error",
              model: "wound-segmentation",
              reason: "Wound segmentation could not analyze this region.",
            },
          }),
        ]}
      />
    );
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Segmentation unavailable");
    expect(markup).toContain("Error");
    expect(markup).toContain("Segmentation error");
    expect(markup).toContain("infected wound");
    expect(markup).not.toContain("infected diabetic wound");
    expect((markup.match(/Review required/g) ?? []).length).toBe(2);
  });

  it("shows an explicit empty-mask state", () => {
    const markup = renderToStaticMarkup(
      <RegionAnalysisList
        language="en"
        regions={[
          region({
            segmentation: { ...segmentationOk, woundPixelFraction: 0 },
          }),
        ]}
      />
    );
    expect(markup).toContain("No wound pixels above threshold");
    expect(markup).toContain("0.0% of this detector crop");
  });

  it("maps the mask into the detector box rather than the full image", () => {
    const markup = renderToStaticMarkup(
      <DetectionOverlay
        detections={[detection]}
        regions={[region()]}
        layout={{
          naturalWidth: 640,
          naturalHeight: 640,
          viewportWidth: 640,
          viewportHeight: 640,
        }}
        language="en"
      />
    );
    expect(markup).toContain("camera-segmentation-mask");
    expect(markup).toContain("data:image/png;base64,AA==");
    expect(markup).toContain("left:12px");
    expect(markup).toContain("top:24px");
    expect(markup).toContain("width:180px");
    expect(markup).toContain("height:140px");
  });

  it("renders keyboard-accessible overlay controls and a bilingual control label", () => {
    const markup = renderToStaticMarkup(
      <OverlayControls
        language="th"
        showDetectorBoxes
        showWoundMasks
        maskOpacity={0.55}
        hasMasks
        onShowDetectorBoxesChange={() => undefined}
        onShowWoundMasksChange={() => undefined}
        onMaskOpacityChange={() => undefined}
      />
    );
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('type="range"');
    expect(markup).toContain("แสดงกรอบตัวตรวจจับ");
    expect(markup).toContain("แสดงหน้ากากพื้นที่แผล");
    expect(markup).toContain("คำอธิบายชั้นข้อมูล");
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
    expect(markup).toContain("segmentation");
    expect(markup).toContain("full image");
  });
});
