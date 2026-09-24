import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

const MODEL_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "models", "diabetes-wound-detector.onnx");
const IMAGE_SIZE = 640;
const CLASS_NAMES = ["callus_corn", "dfu_ulcer", "infected_wound", "necrotic_wound", "normal_foot"] as const;
const DEFAULT_CONFIDENCE = 0.25;
const IOU_THRESHOLD = 0.45;

type Detection = {
  classId: number;
  label: (typeof CLASS_NAMES)[number];
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
};

type InferenceResult = {
  model: "diabetes-wound-detector";
  task: "detect";
  disclaimer: "Model suggestion only; clinician review required.";
  detections: Detection[];
  topSuggestion: Detection | null;
};

let sessionPromise: Promise<any> | null = null;

function getSession() {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  return sessionPromise;
}

function iou(a: Detection["box"], b: Detection["box"]) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function suppressOverlappingDetections(detections: Detection[]) {
  const kept: Detection[] = [];
  for (const candidate of [...detections].sort((a, b) => b.confidence - a.confidence)) {
    if (!kept.some((existing) => existing.classId === candidate.classId && iou(existing.box, candidate.box) > IOU_THRESHOLD)) {
      kept.push(candidate);
    }
  }
  return kept.slice(0, 20);
}

export async function inferWoundImage(image: Buffer, confidence = DEFAULT_CONFIDENCE): Promise<InferenceResult> {
  const decoded = await sharp(image).rotate().resize({ width: IMAGE_SIZE, height: IMAGE_SIZE, fit: "contain", background: { r: 114, g: 114, b: 114 } }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Float32Array(1 * 3 * IMAGE_SIZE * IMAGE_SIZE);
  const planeSize = IMAGE_SIZE * IMAGE_SIZE;
  for (let index = 0; index < planeSize; index += 1) {
    pixels[index] = decoded.data[index * 3] / 255;
    pixels[planeSize + index] = decoded.data[index * 3 + 1] / 255;
    pixels[planeSize * 2 + index] = decoded.data[index * 3 + 2] / 255;
  }

  const session = await getSession();
  const output = await session.run({ images: new ort.Tensor("float32", pixels, [1, 3, IMAGE_SIZE, IMAGE_SIZE]) });
  const tensor = output.output0;
  const dimensions = tensor.dims;
  const data = tensor.data as Float32Array;
  const anchors = dimensions[2] ?? 0;
  const channels = dimensions[1] ?? 0;
  if (channels < 4 + CLASS_NAMES.length || anchors === 0) {
    throw new Error("Unexpected wound detector output shape");
  }

  const detections: Detection[] = [];
  for (let anchor = 0; anchor < anchors; anchor += 1) {
    let classId = 0;
    let classConfidence = 0;
    for (let candidate = 0; candidate < CLASS_NAMES.length; candidate += 1) {
      const score = data[(4 + candidate) * anchors + anchor];
      if (score > classConfidence) {
        classConfidence = score;
        classId = candidate;
      }
    }
    if (classConfidence < confidence) continue;

    const rawX = data[anchor];
    const rawY = data[anchors + anchor];
    const rawWidth = data[anchors * 2 + anchor];
    const rawHeight = data[anchors * 3 + anchor];
    const width = Math.max(0, Math.min(IMAGE_SIZE, rawWidth));
    const height = Math.max(0, Math.min(IMAGE_SIZE, rawHeight));
    const x = Math.max(0, Math.min(IMAGE_SIZE - width, rawX - width / 2));
    const y = Math.max(0, Math.min(IMAGE_SIZE - height, rawY - height / 2));
    detections.push({ classId, label: CLASS_NAMES[classId], confidence: Math.round(classConfidence * 1000) / 1000, box: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) } });
  }

  const kept = suppressOverlappingDetections(detections);
  return { model: "diabetes-wound-detector", task: "detect", disclaimer: "Model suggestion only; clinician review required.", detections: kept, topSuggestion: kept[0] ?? null };
}
