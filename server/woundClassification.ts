import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

const CLASSIFIER_FILENAME = "azh-classifier.onnx";
const METADATA_FILENAME = "azh-classifier.labels.json";
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH =
  [
    path.join(MODULE_DIRECTORY, "models", CLASSIFIER_FILENAME),
    path.resolve(
      MODULE_DIRECTORY,
      "..",
      "server",
      "models",
      CLASSIFIER_FILENAME
    ),
  ].find(candidate => fs.existsSync(candidate)) ??
  path.join(MODULE_DIRECTORY, "models", CLASSIFIER_FILENAME);
const METADATA_PATH =
  [
    path.join(MODULE_DIRECTORY, "models", METADATA_FILENAME),
    path.resolve(MODULE_DIRECTORY, "..", "server", "models", METADATA_FILENAME),
  ].find(candidate => fs.existsSync(candidate)) ??
  path.join(MODULE_DIRECTORY, "models", METADATA_FILENAME);
const IMAGE_SIZE = 128;
const CLASSIFIER_ENABLED = process.env.ENABLE_AZH_CLASSIFIER !== "false";
export const AZH_CLASS_CODES = ["BG", "D", "N", "P", "S", "V"] as const;
const CLASS_LABELS: Record<(typeof AZH_CLASS_CODES)[number], string> = {
  BG: "Background",
  D: "Diabetic wound",
  N: "Normal skin",
  P: "Pressure wound",
  S: "Surgical wound",
  V: "Venous wound",
};

type AzhCode = (typeof AZH_CLASS_CODES)[number];
type AzhMetadata = {
  model?: unknown;
  version?: unknown;
  checkpoint_epoch?: unknown;
  onnx_sha256?: unknown;
  classes?: unknown;
  class_label_map?: Record<string, string>;
};

type AzhClassificationOk = {
  status: "ok";
  model: "azh-classifier";
  code: AzhCode;
  name: string;
  confidence: number;
  probabilities: Record<AzhCode, number>;
};

export type AzhClassification = AzhClassificationOk;
export type AzhClassifierContract = {
  model: "azh-classifier";
  version: string;
  classes: AzhCode[];
  artifactSha256?: string;
};

let sessionPromise: Promise<any> | null = null;
let validatedMetadata: AzhMetadata | null = null;

function sha256File(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readAndValidateMetadata(): AzhMetadata {
  if (validatedMetadata) return validatedMetadata;
  if (!fs.existsSync(METADATA_PATH))
    throw new Error("AZH classifier metadata is unavailable");

  const metadata = JSON.parse(
    fs.readFileSync(METADATA_PATH, "utf8")
  ) as AzhMetadata;
  const classes = metadata.classes;
  if (
    !Array.isArray(classes) ||
    classes.length !== AZH_CLASS_CODES.length ||
    classes.some((value, index) => value !== AZH_CLASS_CODES[index])
  ) {
    throw new Error(
      "AZH classifier metadata class order does not match the server contract"
    );
  }
  for (const code of AZH_CLASS_CODES) {
    if (metadata.class_label_map?.[code] !== CLASS_LABELS[code]) {
      throw new Error(
        `AZH classifier metadata label mapping is invalid for ${code}`
      );
    }
  }
  if (typeof metadata.onnx_sha256 === "string" && fs.existsSync(MODEL_PATH) && sha256File(MODEL_PATH) !== metadata.onnx_sha256) {
    throw new Error("AZH classifier artifact hash does not match metadata");
  }
  validatedMetadata = metadata;
  return metadata;
}

function getSession() {
  readAndValidateMetadata();
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  return sessionPromise;
}

export function getAzhClassifierReadiness() {
  return {
    model: "azh-classifier",
    enabled: CLASSIFIER_ENABLED,
    available: fs.existsSync(MODEL_PATH) && fs.existsSync(METADATA_PATH),
  } as const;
}

export function getAzhClassifierContract(): AzhClassifierContract {
  let metadata: AzhMetadata | null = null;
  try {
    metadata = readAndValidateMetadata();
  } catch {
    // Readiness stays independent from the response contract when metadata is unavailable.
  }
  const checkpointEpoch =
    typeof metadata?.checkpoint_epoch === "number"
      ? metadata.checkpoint_epoch
      : null;
  const version =
    typeof metadata?.version === "string"
      ? metadata.version
      : checkpointEpoch === null
        ? "unknown"
        : `azh-epoch-${checkpointEpoch}`;
  return {
    model: "azh-classifier",
    version,
    classes: [...AZH_CLASS_CODES],
    ...(typeof metadata?.onnx_sha256 === "string"
      ? { artifactSha256: metadata.onnx_sha256 }
      : {}),
  };
}

export function isAzhClassifierEnabled() {
  return CLASSIFIER_ENABLED;
}

function softmax(logits: ArrayLike<number>) {
  if (logits.length !== AZH_CLASS_CODES.length)
    throw new Error(
      "AZH classifier logits do not match the six-class contract"
    );
  const values = Array.from({ length: AZH_CLASS_CODES.length }, (_, index) =>
    Number(logits[index])
  );
  if (values.some(value => !Number.isFinite(value)))
    throw new Error("AZH classifier returned a non-finite logit");
  const maximum = Math.max(...values);
  const exponentials = values.map(value => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0)
    throw new Error("AZH classifier probability normalization failed");
  return exponentials.map(value => value / total);
}

export async function classifyWoundCrop(
  rawRgb: Buffer,
  width: number,
  height: number
): Promise<AzhClassification> {
  if (!CLASSIFIER_ENABLED) throw new Error("AZH classifier is disabled");
  if (!getAzhClassifierReadiness().available)
    throw new Error("AZH classifier artifact is unavailable");
  if (width < 2 || height < 2)
    throw new Error("classification crop is too small");

  const resized = await sharp(rawRgb, { raw: { width, height, channels: 3 } })
    .resize({ width: IMAGE_SIZE, height: IMAGE_SIZE, fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Float32Array(3 * IMAGE_SIZE * IMAGE_SIZE);
  const planeSize = IMAGE_SIZE * IMAGE_SIZE;
  for (let index = 0; index < planeSize; index += 1) {
    pixels[index] = resized.data[index * 3] / 255;
    pixels[planeSize + index] = resized.data[index * 3 + 1] / 255;
    pixels[planeSize * 2 + index] = resized.data[index * 3 + 2] / 255;
  }

  const session = await getSession();
  const output = await session.run({
    images: new ort.Tensor("float32", pixels, [1, 3, IMAGE_SIZE, IMAGE_SIZE]),
  });
  const tensor = output.logits ?? output.output0;
  if (!tensor?.data || tensor.data.length !== AZH_CLASS_CODES.length)
    throw new Error("Unexpected AZH classifier output shape");
  if (
    tensor.dims &&
    (tensor.dims.length !== 2 ||
      tensor.dims[0] !== 1 ||
      tensor.dims[1] !== AZH_CLASS_CODES.length)
  ) {
    throw new Error("Unexpected AZH classifier output dimensions");
  }
  const probabilities = softmax(tensor.data);
  let topIndex = 0;
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[topIndex]) topIndex = index;
  }
  const rounded = Object.fromEntries(
    AZH_CLASS_CODES.map((code, index) => [
      code,
      Math.round(probabilities[index] * 10_000) / 10_000,
    ])
  ) as Record<AzhCode, number>;
  return {
    status: "ok",
    model: "azh-classifier",
    code: AZH_CLASS_CODES[topIndex],
    name: CLASS_LABELS[AZH_CLASS_CODES[topIndex]],
    confidence: Math.round(probabilities[topIndex] * 1000) / 1000,
    probabilities: rounded,
  };
}
