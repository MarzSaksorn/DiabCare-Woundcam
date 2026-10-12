import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  classifyWoundCrop,
  getAzhClassifierContract,
  getAzhClassifierReadiness,
} from "./woundClassification";

describe("AZH wound classifier", () => {
  it("loads the packaged ONNX classifier and returns named probabilities", async () => {
    expect(getAzhClassifierReadiness()).toMatchObject({
      model: "azh-classifier",
      enabled: true,
      available: true,
    });
    expect(getAzhClassifierContract()).toEqual({
      model: "azh-classifier",
      version: "azh-epoch-13",
      classes: ["BG", "D", "N", "P", "S", "V"],
      artifactSha256:
        "b848889c359dfaf42b94524dccdff97dfff04f9ddeaf2cd4ae29b0778e42d39b",
    });
    const image = await sharp({
      create: {
        width: 96,
        height: 96,
        channels: 3,
        background: { r: 160, g: 120, b: 100 },
      },
    })
      .raw()
      .toBuffer();
    const result = await classifyWoundCrop(image, 96, 96);
    expect(result.status).toBe("ok");
    expect(["BG", "D", "N", "P", "S", "V"]).toContain(result.code);
    expect([
      "Background",
      "Diabetic wound",
      "Normal skin",
      "Pressure wound",
      "Surgical wound",
      "Venous wound",
    ]).toContain(result.name);
    expect(Object.keys(result.probabilities)).toEqual([
      "BG",
      "D",
      "N",
      "P",
      "S",
      "V",
    ]);
    expect(
      Object.values(result.probabilities).reduce((sum, value) => sum + value, 0)
    ).toBeCloseTo(1, 3);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }, 30_000);
});
