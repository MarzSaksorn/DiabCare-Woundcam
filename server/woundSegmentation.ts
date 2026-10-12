import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

const MODEL_FILENAME = "wound-segmentation.onnx";
const METADATA_FILENAME = "wound-segmentation.labels.json";
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
const IMAGE_SIZE = 128;
const DEFAULT_THRESHOLD = 0.5;
const MAX_MASK_BYTES = 256 * 1024;
const SEGMENTATION_ENABLED = process.env.WOUND_SEGMENTATION_ENABLED === "true";

export type SegmentationContract = {
  model: "wound-segmentation";
  version: string;
  classes: ["background", "wound"];
  threshold: number;
  artifactSha256?: string;
};

export type SegmentationMetadata = {
  model?: unknown;
  version?: unknown;
  task?: unknown;
  format?: unknown;
  input?: {
    name?: unknown;
    shape?: unknown;
    color_order?: unknown;
    normalization?: unknown;
  };
  output?: { name?: unknown; shape?: unknown };
  classes?: unknown;
  threshold?: unknown;
  onnx_sha256?: unknown;
  clinical_use?: unknown;
};

type SegmentationMask = {
  width: 128;
  height: 128;
  encoding: "png-base64";
  data: string;
};

export type SegmentationResult =
  | {
      status: "ok";
      model: "wound-segmentation";
      threshold: number;
      mask: SegmentationMask;
      woundPixelFraction: number;
    }
  | {
      status: "unavailable" | "error";
      model: "wound-segmentation";
      reason: string;
    };

export type SegmentationLogits = {
  dims: readonly number[];
  data: ArrayLike<number>;
};

let sessionPromise: Promise<any> | null = null;
let validatedMetadata: SegmentationMetadata | null = null;
let metadataValidationError: string | null = null;

function sha256File(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function configuredThreshold(metadata?: SegmentationMetadata | null) {
  const configured = Number(
    process.env.WOUND_SEGMENTATION_THRESHOLD ??
      metadata?.threshold ??
      DEFAULT_THRESHOLD
  );
  return Number.isFinite(configured) && configured >= 0 && configured <= 1
    ? configured
    : DEFAULT_THRESHOLD;
}

export function validateWoundSegmentationMetadata(
  metadata: SegmentationMetadata,
  actualArtifactSha256?: string
) {
  const expectedInputShape = JSON.stringify([
    "batch",
    3,
    IMAGE_SIZE,
    IMAGE_SIZE,
  ]);
  const expectedOutputShape = JSON.stringify([
    "batch",
    1,
    IMAGE_SIZE,
    IMAGE_SIZE,
  ]);
  if (
    metadata.model !== "wound-segmentation" ||
    metadata.task !== "binary_segmentation" ||
    metadata.format !== "onnx" ||
    metadata.input?.name !== "images" ||
    metadata.output?.name !== "mask_logits" ||
    JSON.stringify(metadata.input?.shape) !== expectedInputShape ||
    JSON.stringify(metadata.output?.shape) !== expectedOutputShape ||
    JSON.stringify(metadata.classes) !==
      JSON.stringify(["background", "wound"]) ||
    metadata.input?.color_order !== "RGB" ||
    metadata.input?.normalization !== "pixel / 255" ||
    metadata.clinical_use !== false
  ) {
    throw new Error(
      "Wound segmentation metadata does not match the server contract"
    );
  }
  if (
    typeof metadata.threshold !== "number" ||
    metadata.threshold < 0 ||
    metadata.threshold > 1
  ) {
    throw new Error("Wound segmentation metadata threshold is invalid");
  }
  if (
    typeof metadata.onnx_sha256 === "string" &&
    actualArtifactSha256 &&
    actualArtifactSha256 !== metadata.onnx_sha256
  ) {
    throw new Error("Wound segmentation artifact hash does not match metadata");
  }
}

function readAndValidateMetadata(): SegmentationMetadata {
  if (validatedMetadata) return validatedMetadata;
  if (metadataValidationError) throw new Error(metadataValidationError);
  if (!fs.existsSync(METADATA_PATH)) {
    metadataValidationError = "Wound segmentation metadata is unavailable";
    throw new Error(metadataValidationError);
  }

  try {
    const metadata = JSON.parse(
      fs.readFileSync(METADATA_PATH, "utf8")
    ) as SegmentationMetadata;
    validateWoundSegmentationMetadata(
      metadata,
      fs.existsSync(MODEL_PATH) ? sha256File(MODEL_PATH) : undefined
    );
    validatedMetadata = metadata;
    return metadata;
  } catch (error) {
    metadataValidationError =
      error instanceof Error
        ? error.message
        : "Wound segmentation metadata is invalid";
    throw new Error(metadataValidationError);
  }
}

export function getWoundSegmentationReadiness() {
  const artifactAvailable = fs.existsSync(MODEL_PATH);
  const metadataAvailable = fs.existsSync(METADATA_PATH);
  let metadataValid = false;
  if (metadataAvailable) {
    try {
      readAndValidateMetadata();
      metadataValid = true;
    } catch {
      metadataValid = false;
    }
  }
  return {
    model: "wound-segmentation",
    enabled: SEGMENTATION_ENABLED,
    available: artifactAvailable && metadataAvailable && metadataValid,
    artifactAvailable,
    metadataAvailable,
    metadataValid,
  } as const;
}

export function getWoundSegmentationContract(): SegmentationContract {
  let metadata: SegmentationMetadata | null = null;
  try {
    metadata = readAndValidateMetadata();
  } catch {
    // Contract metadata remains stable when the optional artifact is not installed.
  }
  return {
    model: "wound-segmentation",
    version:
      typeof metadata?.version === "string" ? metadata.version : "unknown",
    classes: ["background", "wound"],
    threshold: configuredThreshold(metadata),
    ...(typeof metadata?.onnx_sha256 === "string"
      ? { artifactSha256: metadata.onnx_sha256 }
      : {}),
  };
}

export function isWoundSegmentationEnabled() {
  return SEGMENTATION_ENABLED;
}

function getSession() {
  readAndValidateMetadata();
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  return sessionPromise;
}

function sigmoid(value: number) {
  if (value >= 0) {
    const exponent = Math.exp(-value);
    return 1 / (1 + exponent);
  }
  const exponent = Math.exp(value);
  return exponent / (1 + exponent);
}

export function decodeSegmentationOutput(
  tensor: SegmentationLogits,
  threshold: number
) {
  if (
    tensor.dims.length !== 4 ||
    tensor.dims[0] !== 1 ||
    tensor.dims[1] !== 1 ||
    tensor.dims[2] !== IMAGE_SIZE ||
    tensor.dims[3] !== IMAGE_SIZE ||
    tensor.data.length !== IMAGE_SIZE * IMAGE_SIZE
  ) {
    throw new Error("Unexpected wound segmentation output shape");
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error("Wound segmentation threshold is invalid");
  const pixels = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
  let woundPixels = 0;
  for (let index = 0; index < pixels.length; index += 1) {
    const logit = Number(tensor.data[index]);
    if (!Number.isFinite(logit))
      throw new Error("Wound segmentation returned a non-finite logit");
    const wound = sigmoid(logit) >= threshold;
    pixels[index] = wound ? 1 : 0;
    if (wound) woundPixels += 1;
  }
  return {
    pixels,
    woundPixels,
    woundPixelFraction: woundPixels / pixels.length,
  } as const;
}

export async function encodeBinaryMask(
  pixels: Uint8Array,
  width = IMAGE_SIZE,
  height = IMAGE_SIZE
): Promise<SegmentationMask> {
  if (
    width !== IMAGE_SIZE ||
    height !== IMAGE_SIZE ||
    pixels.length !== width * height
  )
    throw new Error("Wound segmentation mask dimensions are invalid");
  const rgba = Buffer.alloc(pixels.length * 4);
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    if (pixels[index]) {
      rgba[offset] = 229;
      rgba[offset + 1] = 73;
      rgba[offset + 2] = 84;
      rgba[offset + 3] = 190;
    }
  }
  const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
  if (png.byteLength > MAX_MASK_BYTES)
    throw new Error("Wound segmentation mask payload is too large");
  return {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    encoding: "png-base64",
    data: png.toString("base64"),
  };
}

function unavailable(reason: string): SegmentationResult {
  return { status: "unavailable", model: "wound-segmentation", reason };
}

function errorResult(reason: string): SegmentationResult {
  return { status: "error", model: "wound-segmentation", reason };
}

export async function segmentWoundCrop(
  rawRgb: Buffer,
  width: number,
  height: number
): Promise<SegmentationResult> {
  if (width < 2 || height < 2)
    return errorResult("segmentation crop is too small");
  if (!isWoundSegmentationEnabled())
    return unavailable("Wound segmentation is disabled.");
  if (!getWoundSegmentationReadiness().available)
    return unavailable("Wound segmentation artifact is unavailable.");

  try {
    const metadata = readAndValidateMetadata();
    const threshold = configuredThreshold(metadata);
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
    const tensor = output.mask_logits;
    if (!tensor?.data || !tensor.dims)
      throw new Error("Wound segmentation did not return mask_logits");
    const decoded = decodeSegmentationOutput(tensor, threshold);
    const mask = await encodeBinaryMask(decoded.pixels);
    return {
      status: "ok",
      model: "wound-segmentation",
      threshold,
      mask,
      woundPixelFraction: decoded.woundPixelFraction,
    };
  } catch {
    return errorResult("Wound segmentation could not analyze this region.");
  }
}
