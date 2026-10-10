import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  analyzeDetectedRegions,
  decodeWoundDetections,
  inferWoundImage,
  type Detection,
} from "./woundInference";
import type { AzhClassification } from "./woundClassification";

const decodedImage = {
  data: Buffer.alloc(640 * 640 * 3, 128),
  info: { width: 640, height: 640, channels: 3 },
};
const classification: AzhClassification = {
  status: "ok",
  model: "azh-classifier",
  code: "D",
  name: "Diabetic wound",
  confidence: 0.4,
  probabilities: { BG: 0.1, D: 0.4, N: 0.2, P: 0.1, S: 0.1, V: 0.1 },
};

function detection(
  label: Detection["label"],
  classId: number,
  x: number
): Detection {
  return {
    classId,
    label,
    confidence: 0.8,
    box: { x, y: 20, width: 120, height: 100 },
  };
}

describe("wound inference", () => {
  it("loads the exported detector and returns a safe structured result", async () => {
    const image = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 160, g: 120, b: 100 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await inferWoundImage(image, 0.25);

    expect(result.model).toBe("diabetes-wound-detector");
    expect(result.task).toBe("detect");
    expect(result.pipeline).toBe("detector+azh-classifier");
    expect(result.schemaVersion).toBe(1);
    expect(result.disclaimer).toContain("clinician review");
    expect(result.detector).toMatchObject({
      model: "diabetes-wound-detector",
      version: "onnx-ultralytics-8.3.0",
      classes: [
        "callus_corn",
        "dfu_ulcer",
        "infected_wound",
        "necrotic_wound",
        "normal_foot",
      ],
      artifactSha256:
        "80055714a44b3df6e97371b69da74930a63e63ca51e138fe24a2a19fb71e6a02",
    });
    expect(result.classifier).toMatchObject({
      model: "azh-classifier",
      version: "azh-epoch-13",
      classes: ["BG", "D", "N", "P", "S", "V"],
      artifactSha256:
        "b848889c359dfaf42b94524dccdff97dfff04f9ddeaf2cd4ae29b0778e42d39b",
    });
    expect(Array.isArray(result.detections)).toBe(true);
    expect(result.regions).toHaveLength(result.detections.length);
    expect(
      result.detections.every(item =>
        [
          "callus_corn",
          "dfu_ulcer",
          "infected_wound",
          "necrotic_wound",
          "normal_foot",
        ].includes(item.label)
      )
    ).toBe(true);
    expect(
      result.detections.every(
        item => item.confidence >= 0.25 && item.confidence <= 1
      )
    ).toBe(true);
    expect(
      result.detections.every(
        item =>
          item.box.x >= 0 &&
          item.box.y >= 0 &&
          item.box.width >= 0 &&
          item.box.height >= 0 &&
          item.box.x + item.box.width <= 640 &&
          item.box.y + item.box.height <= 640
      )
    ).toBe(true);
  }, 30_000);

  it("decodes the reviewed output shape, clamps boxes, and drops invalid regions", () => {
    const data = new Float32Array(300 * 6);
    data.set([-20, -10, 700, 800, 0.9, 1], 0);
    data.set([10, 10, 10, 20, 0.8, 0], 6);
    data.set([0, 0, 100, 100, Number.NaN, 0], 12);

    const result = decodeWoundDetections({ dims: [1, 300, 6], data }, 0.25);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      label: "dfu_ulcer",
      confidence: 0.9,
      box: { x: 0, y: 0, width: 640, height: 640 },
    });

    const rawYolo = new Float32Array([320, 320, 80, 80, 0.1, 0.8, 0, 0, 0]);
    expect(decodeWoundDetections({ dims: [1, 9, 1], data: rawYolo }, 0.25)).toMatchObject([
      { label: "dfu_ulcer", confidence: 0.8, box: { x: 280, y: 280, width: 80, height: 80 } },
    ]);
  });

  it("returns one classifier result per kept detector region in stable order", async () => {
    const detections = [
      detection("dfu_ulcer", 1, 10),
      detection("infected_wound", 2, 200),
    ];
    const calls: number[] = [];
    const regions = await analyzeDetectedRegions(decodedImage, detections, {
      enabled: true,
      available: true,
      classify: async (_raw, width, height) => {
        calls.push(width * height);
        return classification;
      },
    });

    expect(regions).toHaveLength(2);
    expect(regions.map(region => region.detection.label)).toEqual([
      "dfu_ulcer",
      "infected_wound",
    ]);
    expect(
      regions.every(
        region => region.classification.status === "ok" && region.reviewRequired
      )
    ).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls.every((area) => area === 12000)).toBe(true);
  });

  it("preserves detector output when classifier inference fails", async () => {
    const detections = [detection("dfu_ulcer", 1, 10)];
    const regions = await analyzeDetectedRegions(decodedImage, detections, {
      enabled: true,
      available: true,
      classify: async () => {
        throw new Error("simulated classifier failure");
      },
    });

    expect(regions).toHaveLength(1);
    expect(regions[0].detection).toEqual(detections[0]);
    expect(regions[0].classification).toMatchObject({
      status: "error",
      model: "azh-classifier",
    });
  });

  it("does not call the classifier when the detector has no qualifying region", async () => {
    let called = false;
    const regions = await analyzeDetectedRegions(decodedImage, [], {
      enabled: true,
      available: true,
      classify: async () => {
        called = true;
        return classification;
      },
    });

    expect(regions).toEqual([]);
    expect(called).toBe(false);
  });
});
