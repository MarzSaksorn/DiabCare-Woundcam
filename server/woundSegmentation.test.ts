import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  decodeSegmentationOutput,
  encodeBinaryMask,
  getWoundSegmentationContract,
  getWoundSegmentationReadiness,
  segmentWoundCrop,
  validateWoundSegmentationMetadata,
} from "./woundSegmentation";

describe("wound segmentation", () => {
  it("reports the packaged artifact and validated runtime contract", () => {
    expect(getWoundSegmentationReadiness()).toMatchObject({
      model: "wound-segmentation",
      enabled: false,
      available: true,
      artifactAvailable: true,
      metadataAvailable: true,
      metadataValid: true,
    });
    expect(getWoundSegmentationContract()).toMatchObject({
      model: "wound-segmentation",
      version: "wound-segmentation-xpu-best",
      classes: ["background", "wound"],
      threshold: 0.5,
      artifactSha256:
        "269ed002a5bc5fa20c2d11dfb85b5b00f9c768e0e40a5ca28022477c4ff8f48e",
    });
  });

  it("converts logits with the configured threshold and reports bounded coverage", () => {
    const data = new Float32Array(128 * 128).fill(-100);
    data[0] = 0;
    data[1] = 100;
    const result = decodeSegmentationOutput(
      { dims: [1, 1, 128, 128], data },
      0.5
    );
    expect(result.pixels[0]).toBe(1);
    expect(result.pixels[1]).toBe(1);
    expect(result.pixels[2]).toBe(0);
    expect(result.woundPixels).toBe(2);
    expect(result.woundPixelFraction).toBeGreaterThanOrEqual(0);
    expect(result.woundPixelFraction).toBeLessThanOrEqual(1);
  });

  it("fails closed for wrong tensor shapes and non-finite output", () => {
    expect(() =>
      decodeSegmentationOutput(
        { dims: [1, 2, 128, 128], data: new Float32Array(2 * 128 * 128) },
        0.5
      )
    ).toThrow("Unexpected wound segmentation output shape");
    const data = new Float32Array(128 * 128).fill(0);
    data[10] = Number.NaN;
    expect(() =>
      decodeSegmentationOutput({ dims: [1, 1, 128, 128], data }, 0.5)
    ).toThrow("non-finite logit");
  });

  it("rejects metadata whose artifact hash does not match the ONNX file", () => {
    const metadata = {
      model: "wound-segmentation",
      task: "binary_segmentation",
      format: "onnx",
      input: {
        name: "images",
        shape: ["batch", 3, 128, 128],
        color_order: "RGB",
        normalization: "pixel / 255",
      },
      output: { name: "mask_logits", shape: ["batch", 1, 128, 128] },
      classes: ["background", "wound"],
      threshold: 0.5,
      clinical_use: false,
      onnx_sha256: "expected-hash",
    };
    expect(() =>
      validateWoundSegmentationMetadata(metadata, "different-hash")
    ).toThrow("artifact hash does not match");
    expect(() =>
      validateWoundSegmentationMetadata(
        { ...metadata, output: { ...metadata.output, name: "output0" } },
        "expected-hash"
      )
    ).toThrow("server contract");
  });

  it("encodes a bounded 128x128 PNG mask with explicit dimensions", async () => {
    const pixels = new Uint8Array(128 * 128);
    pixels[0] = 1;
    pixels[pixels.length - 1] = 1;
    const mask = await encodeBinaryMask(pixels);
    const decoded = await sharp(Buffer.from(mask.data, "base64")).metadata();
    expect(mask).toMatchObject({
      width: 128,
      height: 128,
      encoding: "png-base64",
    });
    expect(decoded).toMatchObject({ width: 128, height: 128, channels: 4 });
    expect(mask.data.length).toBeLessThan(256 * 1024);
  });

  it("returns explicit unavailable and invalid-crop states", async () => {
    await expect(
      segmentWoundCrop(Buffer.alloc(3), 1, 1)
    ).resolves.toMatchObject({
      status: "error",
      model: "wound-segmentation",
    });
    await expect(
      segmentWoundCrop(Buffer.alloc(2 * 2 * 3), 2, 2)
    ).resolves.toMatchObject({
      status: "unavailable",
      model: "wound-segmentation",
      reason: "Wound segmentation is disabled.",
    });
  });
});
