import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

const MODEL_FILENAME = "diabetes-wound-detector.onnx";
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = [
  path.join(MODULE_DIRECTORY, "models", MODEL_FILENAME),
  path.resolve(MODULE_DIRECTORY, "..", "server", "models", MODEL_FILENAME),
].find((candidate) => fs.existsSync(candidate)) ?? path.join(MODULE_DIRECTORY, "models", MODEL_FILENAME);
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

function clampBox(x: number, y: number, right: number, bottom: number) {
  const left = Math.max(0, Math.min(IMAGE_SIZE, x));
  const top = Math.max(0, Math.min(IMAGE_SIZE, y));
  const boundedRight = Math.max(left, Math.min(IMAGE_SIZE, right));
  const boundedBottom = Math.max(top, Math.min(IMAGE_SIZE, bottom));
  return { x: Math.round(left), y: Math.round(top), width: Math.round(boundedRight - left), height: Math.round(boundedBottom - top) };
}

function decodeDetections(tensor: { dims: readonly number[]; data: ArrayLike<number> }, confidence: number) {
  const dimensions = tensor.dims;
  const data = tensor.data;
  if (dimensions.length !== 3 || dimensions[0] !== 1) throw new Error("Unexpected wound detector output shape");

  // Ultralytics exports with embedded NMS as [1, 300, 6]: xyxy, confidence, class id.
  if (dimensions[1] === 300 && dimensions[2] === 6) {
    const detections: Detection[] = [];
    for (let row = 0; row < dimensions[1]; row += 1) {
      const offset = row * 6;
      const score = Number(data[offset + 4]);
      const classId = Math.round(Number(data[offset + 5]));
      if (score < confidence || classId < 0 || classId >= CLASS_NAMES.length) continue;
      detections.push({ classId, label: CLASS_NAMES[classId], confidence: Math.round(score * 1000) / 1000, box: clampBox(Number(data[offset]), Number(data[offset + 1]), Number(data[offset + 2]), Number(data[offset + 3])) });
    }
    return detections;
  }

  // Raw YOLOv8 exports are commonly [1, 9, 8400] or [1, 8400, 9].
  const channels = dimensions[1] === 4 + CLASS_NAMES.length ? dimensions[1] : dimensions[2];
  const anchors = dimensions[1] === 4 + CLASS_NAMES.length ? dimensions[2] : dimensions[1];
  if (channels !== 4 + CLASS_NAMES.length || !anchors) throw new Error("Unexpected wound detector output shape");
  const valueAt = (channel: number, anchor: number) => dimensions[1] === channels ? Number(data[channel * anchors + anchor]) : Number(data[anchor * channels + channel]);
  const detections: Detection[] = [];
  for (let anchor = 0; anchor < anchors; anchor += 1) {
    let classId = 0;
    let classConfidence = valueAt(4, anchor);
    for (let candidate = 1; candidate < CLASS_NAMES.length; candidate += 1) {
      const score = valueAt(4 + candidate, anchor);
      if (score > classConfidence) {
        classConfidence = score;
        classId = candidate;
      }
    }
    if (classConfidence < confidence) continue;
    const centerX = valueAt(0, anchor);
    const centerY = valueAt(1, anchor);
    const width = Math.max(0, valueAt(2, anchor));
    const height = Math.max(0, valueAt(3, anchor));
    detections.push({ classId, label: CLASS_NAMES[classId], confidence: Math.round(classConfidence * 1000) / 1000, box: clampBox(centerX - width / 2, centerY - height / 2, centerX + width / 2, centerY + height / 2) });
  }
  return detections;
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
  const kept = suppressOverlappingDetections(decodeDetections(tensor, confidence));
  return { model: "diabetes-wound-detector", task: "detect", disclaimer: "Model suggestion only; clinician review required.", detections: kept, topSuggestion: kept[0] ?? null };
}
