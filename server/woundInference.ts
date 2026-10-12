import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import {
  classifyWoundCrop,
  getAzhClassifierContract,
  getAzhClassifierReadiness,
  isAzhClassifierEnabled,
  type AzhClassification,
} from "./woundClassification";
import {
  getWoundSegmentationContract,
  getWoundSegmentationReadiness,
  isWoundSegmentationEnabled,
  segmentWoundCrop,
  type SegmentationResult,
} from "./woundSegmentation";

const MODEL_FILENAME = "diabetes-wound-detector.onnx";
const METADATA_FILENAME = "diabetes-wound-detector.labels.json";
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH =
  [
    path.join(MODULE_DIRECTORY, "models", MODEL_FILENAME),
    path.resolve(MODULE_DIRECTORY, "..", "server", "models", MODEL_FILENAME),
  ].find(candidate => fs.existsSync(candidate)) ??
  path.join(MODULE_DIRECTORY, "models", MODEL_FILENAME);
const METADATA_PATH =
  [
    path.join(MODULE_DIRECTORY, "models", METADATA_FILENAME),
    path.resolve(MODULE_DIRECTORY, "..", "server", "models", METADATA_FILENAME),
  ].find(candidate => fs.existsSync(candidate)) ??
  path.join(MODULE_DIRECTORY, "models", METADATA_FILENAME);
const IMAGE_SIZE = 640;
const DETECTOR_CLASS_NAMES = [
  "callus_corn",
  "dfu_ulcer",
  "infected_wound",
  "necrotic_wound",
  "normal_foot",
] as const;
const DEFAULT_CONFIDENCE = 0.25;
const IOU_THRESHOLD = 0.45;
const MAX_REGIONS_PER_REQUEST = 20;
const MAX_DOWNSTREAM_CONCURRENCY = 4;
const REVIEW_DISCLAIMER =
  "Model suggestion only; clinician review required." as const;

type DetectorMetadata = {
  model?: unknown;
  version?: unknown;
  task?: unknown;
  imgsz?: unknown;
  class_order?: unknown;
  classes?: unknown;
  input?: {
    name?: unknown;
    shape?: unknown;
    color_order?: unknown;
    normalization?: unknown;
  };
  output?: { name?: unknown; shape?: unknown };
  onnx_sha256?: unknown;
};

export type Detection = {
  classId: number;
  label: (typeof DETECTOR_CLASS_NAMES)[number];
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
};

type ClassificationFailure = {
  status: "unavailable" | "error";
  model: "azh-classifier";
  reason: string;
};

export type RegionAnalysis = {
  detection: Detection;
  classification: AzhClassification | ClassificationFailure;
  segmentation: SegmentationResult;
  reviewRequired: true;
};

export type DetectorContract = {
  model: "diabetes-wound-detector";
  version: string;
  classes: string[];
  artifactSha256?: string;
};

export type InferenceResult = {
  model: "diabetes-wound-detector";
  task: "detect";
  pipeline: "detector+azh-classifier+wound-segmentation";
  schemaVersion: 2;
  disclaimer: typeof REVIEW_DISCLAIMER;
  detector: DetectorContract;
  classifier: ReturnType<typeof getAzhClassifierContract>;
  segmentation: ReturnType<typeof getWoundSegmentationContract>;
  detections: Detection[];
  topSuggestion: Detection | null;
  regions: RegionAnalysis[];
};

export type DecodedRgbImage = {
  data: Buffer;
  info: { width: number; height: number; channels: number };
};

type DownstreamRuntime = {
  enabled: boolean;
  available: boolean;
  classify: typeof classifyWoundCrop;
  segmentationEnabled: boolean;
  segmentationAvailable: boolean;
  segment: typeof segmentWoundCrop;
};

type Crop = { data: Buffer; width: number; height: number };

let sessionPromise: Promise<any> | null = null;
let validatedMetadata: DetectorMetadata | null = null;

function sha256File(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readAndValidateDetectorMetadata(): DetectorMetadata {
  if (validatedMetadata) return validatedMetadata;
  if (!fs.existsSync(METADATA_PATH))
    throw new Error("Wound detector metadata is unavailable");
  const metadata = JSON.parse(
    fs.readFileSync(METADATA_PATH, "utf8")
  ) as DetectorMetadata;
  if (metadata.task !== "detect" || metadata.imgsz !== IMAGE_SIZE)
    throw new Error(
      "Wound detector metadata does not match the server contract"
    );
  const classes = Array.isArray(metadata.class_order)
    ? metadata.class_order
    : Object.entries((metadata.classes ?? {}) as Record<string, unknown>)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, value]) => value);
  if (
    classes.length !== DETECTOR_CLASS_NAMES.length ||
    classes.some((value, index) => value !== DETECTOR_CLASS_NAMES[index])
  ) {
    throw new Error(
      "Wound detector metadata class order does not match the server contract"
    );
  }
  const expectedInputShape = JSON.stringify([
    "batch",
    3,
    IMAGE_SIZE,
    IMAGE_SIZE,
  ]);
  const expectedOutputShape = JSON.stringify([1, 300, 6]);
  if (
    metadata.input?.name !== "images" ||
    metadata.output?.name !== "output0" ||
    JSON.stringify(metadata.input?.shape) !== expectedInputShape ||
    JSON.stringify(metadata.output?.shape) !== expectedOutputShape
  )
    throw new Error(
      "Wound detector metadata tensor contract does not match the server contract"
    );
  if (
    typeof metadata.onnx_sha256 === "string" &&
    fs.existsSync(MODEL_PATH) &&
    sha256File(MODEL_PATH) !== metadata.onnx_sha256
  ) {
    throw new Error("Wound detector artifact hash does not match metadata");
  }
  validatedMetadata = metadata;
  return metadata;
}

export function getWoundModelReadiness() {
  return {
    model: "diabetes-wound-detector",
    available: fs.existsSync(MODEL_PATH) && fs.existsSync(METADATA_PATH),
    artifactAvailable: fs.existsSync(MODEL_PATH),
    metadataAvailable: fs.existsSync(METADATA_PATH),
  } as const;
}

export function getCombinedModelReadiness() {
  return {
    detector: getWoundModelReadiness(),
    classifier: getAzhClassifierReadiness(),
    segmentation: getWoundSegmentationReadiness(),
  } as const;
}

function getSession() {
  readAndValidateDetectorMetadata();
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  return sessionPromise;
}

function getDetectorContract(): DetectorContract {
  const metadata = readAndValidateDetectorMetadata();
  return {
    model: "diabetes-wound-detector",
    version:
      typeof metadata.version === "string" ? metadata.version : "unknown",
    classes: [...DETECTOR_CLASS_NAMES],
    ...(typeof metadata.onnx_sha256 === "string"
      ? { artifactSha256: metadata.onnx_sha256 }
      : {}),
  };
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
  for (const candidate of [...detections].sort(
    (a, b) => b.confidence - a.confidence
  )) {
    if (
      !kept.some(
        existing =>
          existing.classId === candidate.classId &&
          iou(existing.box, candidate.box) > IOU_THRESHOLD
      )
    )
      kept.push(candidate);
  }
  return kept.slice(0, MAX_REGIONS_PER_REQUEST);
}

function clampBox(x: number, y: number, right: number, bottom: number) {
  if (![x, y, right, bottom].every(Number.isFinite)) return null;
  const left = Math.max(0, Math.min(IMAGE_SIZE, x));
  const top = Math.max(0, Math.min(IMAGE_SIZE, y));
  const boundedRight = Math.max(left, Math.min(IMAGE_SIZE, right));
  const boundedBottom = Math.max(top, Math.min(IMAGE_SIZE, bottom));
  const box = {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(boundedRight - left),
    height: Math.round(boundedBottom - top),
  };
  return box.width > 0 && box.height > 0 ? box : null;
}

function createDetection(
  classId: number,
  score: number,
  box: { x: number; y: number; right: number; bottom: number }
): Detection | null {
  if (
    !Number.isInteger(classId) ||
    classId < 0 ||
    classId >= DETECTOR_CLASS_NAMES.length ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 1
  )
    return null;
  const boundedBox = clampBox(box.x, box.y, box.right, box.bottom);
  if (!boundedBox) return null;
  return {
    classId,
    label: DETECTOR_CLASS_NAMES[classId],
    confidence: Math.round(score * 1000) / 1000,
    box: boundedBox,
  };
}

export function decodeWoundDetections(
  tensor: { dims: readonly number[]; data: ArrayLike<number> },
  confidence: number
) {
  const dimensions = tensor.dims;
  const data = tensor.data;
  if (dimensions.length !== 3 || dimensions[0] !== 1)
    throw new Error("Unexpected wound detector output shape");
  if (dimensions[1] === 300 && dimensions[2] === 6) {
    const detections: Detection[] = [];
    for (let row = 0; row < dimensions[1]; row += 1) {
      const offset = row * 6;
      const score = Number(data[offset + 4]);
      const classId = Math.round(Number(data[offset + 5]));
      if (score < confidence) continue;
      const detection = createDetection(classId, score, {
        x: Number(data[offset]),
        y: Number(data[offset + 1]),
        right: Number(data[offset + 2]),
        bottom: Number(data[offset + 3]),
      });
      if (detection) detections.push(detection);
    }
    return detections;
  }
  const channels =
    dimensions[1] === 4 + DETECTOR_CLASS_NAMES.length
      ? dimensions[1]
      : dimensions[2];
  const anchors =
    dimensions[1] === 4 + DETECTOR_CLASS_NAMES.length
      ? dimensions[2]
      : dimensions[1];
  if (channels !== 4 + DETECTOR_CLASS_NAMES.length || !anchors)
    throw new Error("Unexpected wound detector output shape");
  const valueAt = (channel: number, anchor: number) =>
    dimensions[1] === channels
      ? Number(data[channel * anchors + anchor])
      : Number(data[anchor * channels + channel]);
  const detections: Detection[] = [];
  for (let anchor = 0; anchor < anchors; anchor += 1) {
    let classId = 0;
    let classConfidence = valueAt(4, anchor);
    for (
      let candidate = 1;
      candidate < DETECTOR_CLASS_NAMES.length;
      candidate += 1
    ) {
      const score = valueAt(4 + candidate, anchor);
      if (Number.isFinite(score) && score > classConfidence) {
        classConfidence = score;
        classId = candidate;
      }
    }
    if (classConfidence < confidence) continue;
    const centerX = valueAt(0, anchor);
    const centerY = valueAt(1, anchor);
    const width = valueAt(2, anchor);
    const height = valueAt(3, anchor);
    const detection = createDetection(classId, classConfidence, {
      x: centerX - width / 2,
      y: centerY - height / 2,
      right: centerX + width / 2,
      bottom: centerY + height / 2,
    });
    if (detection) detections.push(detection);
  }
  return detections;
}

function classificationFailure(
  status: ClassificationFailure["status"],
  reason: string
): ClassificationFailure {
  return { status, model: "azh-classifier", reason };
}

function segmentationUnavailable(reason: string): SegmentationResult {
  return { status: "unavailable", model: "wound-segmentation", reason };
}

function segmentationError(reason: string): SegmentationResult {
  return { status: "error", model: "wound-segmentation", reason };
}

async function cropDetectedRegion(
  decoded: DecodedRgbImage,
  detection: Detection
): Promise<Crop> {
  if (
    decoded.info.channels !== 3 ||
    decoded.info.width < 1 ||
    decoded.info.height < 1
  )
    throw new Error("decoded image is not RGB");
  const left = Math.max(
    0,
    Math.min(decoded.info.width - 1, Math.floor(detection.box.x))
  );
  const top = Math.max(
    0,
    Math.min(decoded.info.height - 1, Math.floor(detection.box.y))
  );
  const right = Math.max(
    left + 1,
    Math.min(
      decoded.info.width,
      Math.ceil(detection.box.x + detection.box.width)
    )
  );
  const bottom = Math.max(
    top + 1,
    Math.min(
      decoded.info.height,
      Math.ceil(detection.box.y + detection.box.height)
    )
  );
  if (right <= left || bottom <= top)
    throw new Error("detector crop has no area");
  const crop = await sharp(decoded.data, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 3,
    },
  })
    .extract({ left, top, width: right - left, height: bottom - top })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: crop.data, width: crop.info.width, height: crop.info.height };
}

async function analyzeRegion(
  decoded: DecodedRgbImage,
  detection: Detection,
  runtime: DownstreamRuntime
): Promise<RegionAnalysis> {
  const classifierReady = runtime.enabled && runtime.available;
  const segmentationReady =
    runtime.segmentationEnabled && runtime.segmentationAvailable;
  let crop: Crop | null = null;
  let cropError = false;
  if (classifierReady || segmentationReady) {
    try {
      crop = await cropDetectedRegion(decoded, detection);
    } catch {
      cropError = true;
    }
  }

  const classificationPromise = !runtime.enabled
    ? Promise.resolve<AzhClassification | ClassificationFailure>(
        classificationFailure("unavailable", "AZH classifier is disabled.")
      )
    : !runtime.available
      ? Promise.resolve<AzhClassification | ClassificationFailure>(
          classificationFailure(
            "unavailable",
            "AZH classifier artifact is unavailable."
          )
        )
      : cropError || !crop
        ? Promise.resolve<AzhClassification | ClassificationFailure>(
            classificationFailure(
              "error",
              "AZH classifier could not analyze this region."
            )
          )
        : runtime
            .classify(crop.data, crop.width, crop.height)
            .catch(() =>
              classificationFailure(
                "error",
                "AZH classifier could not analyze this region."
              )
            );

  const segmentationPromise = !runtime.segmentationEnabled
    ? Promise.resolve<SegmentationResult>(
        segmentationUnavailable("Wound segmentation is disabled.")
      )
    : !runtime.segmentationAvailable
      ? Promise.resolve<SegmentationResult>(
          segmentationUnavailable("Wound segmentation artifact is unavailable.")
        )
      : cropError || !crop
        ? Promise.resolve<SegmentationResult>(
            segmentationError(
              "Wound segmentation could not analyze this region."
            )
          )
        : runtime
            .segment(crop.data, crop.width, crop.height)
            .catch(() =>
              segmentationError(
                "Wound segmentation could not analyze this region."
              )
            );

  const [classification, segmentation] = await Promise.all([
    classificationPromise,
    segmentationPromise,
  ]);
  return { detection, classification, segmentation, reviewRequired: true };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

export async function analyzeDetectedRegions(
  decoded: DecodedRgbImage,
  detections: Detection[],
  runtime?: Partial<DownstreamRuntime>
): Promise<RegionAnalysis[]> {
  if (detections.length === 0) return [];
  const effectiveRuntime: DownstreamRuntime = {
    enabled: runtime?.enabled ?? isAzhClassifierEnabled(),
    available: runtime?.available ?? getAzhClassifierReadiness().available,
    classify: runtime?.classify ?? classifyWoundCrop,
    segmentationEnabled:
      runtime?.segmentationEnabled ?? isWoundSegmentationEnabled(),
    segmentationAvailable:
      runtime?.segmentationAvailable ??
      getWoundSegmentationReadiness().available,
    segment: runtime?.segment ?? segmentWoundCrop,
  };
  return mapWithConcurrency(detections, MAX_DOWNSTREAM_CONCURRENCY, detection =>
    analyzeRegion(decoded, detection, effectiveRuntime)
  );
}

export async function inferWoundImage(
  image: Buffer,
  confidence = DEFAULT_CONFIDENCE
): Promise<InferenceResult> {
  const decoded = await sharp(image)
    .rotate()
    .resize({
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      fit: "contain",
      background: { r: 114, g: 114, b: 114 },
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Float32Array(1 * 3 * IMAGE_SIZE * IMAGE_SIZE);
  const planeSize = IMAGE_SIZE * IMAGE_SIZE;
  for (let index = 0; index < planeSize; index += 1) {
    pixels[index] = decoded.data[index * 3] / 255;
    pixels[planeSize + index] = decoded.data[index * 3 + 1] / 255;
    pixels[planeSize * 2 + index] = decoded.data[index * 3 + 2] / 255;
  }
  const session = await getSession();
  const output = await session.run({
    images: new ort.Tensor("float32", pixels, [1, 3, IMAGE_SIZE, IMAGE_SIZE]),
  });
  const tensor = output.output0;
  if (!tensor?.data || !tensor.dims)
    throw new Error("Wound detector did not return output0");
  const kept = suppressOverlappingDetections(
    decodeWoundDetections(tensor, confidence)
  );
  const regions = await analyzeDetectedRegions(decoded, kept);
  return {
    model: "diabetes-wound-detector",
    task: "detect",
    pipeline: "detector+azh-classifier+wound-segmentation",
    schemaVersion: 2,
    disclaimer: REVIEW_DISCLAIMER,
    detector: getDetectorContract(),
    classifier: getAzhClassifierContract(),
    segmentation: getWoundSegmentationContract(),
    detections: kept,
    topSuggestion: kept[0] ?? null,
    regions,
  };
}
