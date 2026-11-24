import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CameraPreviewFrame from "./CameraPreviewFrame";
import type { InferenceResult } from "./WoundInferenceResults";

const baseProps = {
  statusLabel: "Camera ready",
  fileName: "wound-capture.jpg",
  fileNameFallback: "No image selected",
  previewAlt: "Uploaded wound preview",
  removeImageLabel: "Remove image",
  emptyTitle: "Position the wound inside the frame",
  emptyDetail: "Keep the area centered.",
  errorTitle: "Camera access is required",
  errorDetail: "Camera permission was denied.",
  liveLabel: "Live camera",
  startingLabel: "Starting camera…",
  livePreviewLabel: "Live wound camera preview",
  viewportRef: { current: null },
  previewImageRef: { current: null },
  videoRef: { current: null },
  onPreviewImageLoad: () => undefined,
  onReset: () => undefined,
  imageLayout: null,
  language: "en" as const,
  showDetectorBoxes: true,
  showWoundMasks: true,
  maskOpacity: 0.55,
};

const processedResult: InferenceResult = {
  topSuggestion: {
    label: "dfu_ulcer",
    confidence: 0.82,
    box: { x: 12, y: 24, width: 180, height: 140 },
  },
  detections: [
    {
      label: "dfu_ulcer",
      confidence: 0.82,
      box: { x: 12, y: 24, width: 180, height: 140 },
    },
  ],
  regions: [],
  segmentation: {
    model: "wound-segmentation",
    version: "test",
    classes: ["wound"],
    threshold: 0.5,
  },
  disclaimer: "Model suggestion only; clinician review required.",
};

describe("camera preview frame", () => {
  it("renders the shared frame surface before processing", () => {
    const markup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="captured"
        modeLabel="FRAME READY"
        previewUrl="blob:captured"
        inferenceResult={null}
      />
    );

    expect(markup).toContain("camera-preview-frame--captured");
    expect(markup).toContain("FRAME READY");
    expect(markup).toContain("camera-preview-frame__guides");
    expect(markup).toContain("camera-preview-frame__image-bar");
    expect(markup).toContain("Remove image");
    expect(markup).not.toContain("camera-detection-layer");
  });

  it("keeps the same frame surface and adds model overlays after processing", () => {
    const markup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="processed"
        modeLabel="MODEL REVIEW"
        previewUrl="blob:processed"
        inferenceResult={processedResult}
        imageLayout={{
          naturalWidth: 640,
          naturalHeight: 640,
          viewportWidth: 640,
          viewportHeight: 640,
        }}
      />
    );

    expect(markup).toContain("camera-preview-frame--processed");
    expect(markup).toContain("MODEL REVIEW");
    expect(markup).toContain("camera-preview-frame__guides");
    expect(markup).toContain("camera-detection-layer");
    expect(markup).toContain("camera-detection-box");
    expect(markup).toContain("camera-preview-frame__state-chip");
    expect(markup).toContain('aria-label="Remove image"');
  });

  it("keeps standby, camera startup, live preview, and camera errors distinct", () => {
    const standbyMarkup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="standby"
        modeLabel="Frame guide"
        previewUrl={null}
        inferenceResult={null}
      />
    );
    expect(standbyMarkup).toContain("camera-preview-frame--standby");
    expect(standbyMarkup).toContain("Position the wound inside the frame");

    const startingMarkup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="starting"
        modeLabel="Starting camera"
        previewUrl={null}
        inferenceResult={null}
      />
    );
    expect(startingMarkup).toContain("camera-preview-frame--starting");
    expect(startingMarkup).toContain('aria-label="Live wound camera preview"');
    expect(startingMarkup).toContain("Starting camera…");

    const liveMarkup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="live"
        modeLabel="Camera live preview"
        liveLabel="Camera live preview"
        previewUrl={null}
        inferenceResult={null}
      />
    );
    expect(liveMarkup).toContain("camera-preview-frame--live");
    expect(liveMarkup).toContain("Camera live preview");
    expect(liveMarkup).toContain("<video");

    const errorMarkup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="error"
        modeLabel="Camera error"
        previewUrl={null}
        inferenceResult={null}
      />
    );
    expect(errorMarkup).toContain("camera-preview-frame--error");
    expect(errorMarkup).toContain("Camera access is required");
    expect(errorMarkup).toContain("Camera permission was denied.");
  });

  it("shows processing without model overlays until results exist", () => {
    const markup = renderToStaticMarkup(
      <CameraPreviewFrame
        {...baseProps}
        mode="processing"
        modeLabel="Review in progress"
        previewUrl="blob:processing"
        inferenceResult={null}
      />
    );

    expect(markup).toContain("camera-preview-frame--processing");
    expect(markup).toContain("Review in progress");
    expect(markup).toContain("camera-preview-frame__state-chip");
    expect(markup).not.toContain("camera-detection-layer");
    expect(markup).toContain('aria-label="Remove image"');
  });
});
