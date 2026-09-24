import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inferWoundImage } from "./woundInference";

describe("wound inference", () => {
  it("loads the exported detector and returns a safe structured result", async () => {
    const image = await sharp({
      create: { width: 128, height: 128, channels: 3, background: { r: 160, g: 120, b: 100 } },
    }).jpeg().toBuffer();

    const result = await inferWoundImage(image, 0.25);

    expect(result.model).toBe("diabetes-wound-detector");
    expect(result.task).toBe("detect");
    expect(result.disclaimer).toContain("clinician review");
    expect(Array.isArray(result.detections)).toBe(true);
    expect(result.detections.every((item) => ["callus_corn", "dfu_ulcer", "infected_wound", "necrotic_wound", "normal_foot"].includes(item.label))).toBe(true);
    expect(result.detections.every((item) => item.confidence >= 0.25 && item.confidence <= 1)).toBe(true);
    expect(result.detections.every((item) => item.box.x >= 0 && item.box.y >= 0 && item.box.width >= 0 && item.box.height >= 0)).toBe(true);
  }, 30_000);
});
