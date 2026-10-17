import {
  Camera,
  FileImage,
  Video,
  X,
} from "lucide-react";
import React, { type RefObject } from "react";
import {
  DetectionOverlay,
  type ImageLayout,
  type InferenceResult,
} from "@/components/WoundInferenceResults";

export type CameraPreviewMode =
  | "standby"
  | "starting"
  | "live"
  | "error"
  | "captured"
  | "processing"
  | "processed";

type CameraPreviewFrameProps = {
  mode: CameraPreviewMode;
  modeLabel: string;
  statusLabel: string;
  fileName: string;
  fileNameFallback: string;
  previewUrl: string | null;
  previewAlt: string;
  removeImageLabel: string;
  emptyTitle: string;
  emptyDetail: string;
  errorTitle: string;
  errorDetail: string;
  liveLabel: string;
  startingLabel: string;
  livePreviewLabel: string;
  viewportRef: RefObject<HTMLDivElement | null>;
  previewImageRef: RefObject<HTMLImageElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onPreviewImageLoad: () => void;
  onReset: () => void;
  inferenceResult: InferenceResult | null;
  imageLayout: ImageLayout | null;
  language: "th" | "en";
  showDetectorBoxes: boolean;
  showWoundMasks: boolean;
  maskOpacity: number;
};

export default function CameraPreviewFrame({
  mode,
  modeLabel,
  statusLabel,
  fileName,
  fileNameFallback,
  previewUrl,
  previewAlt,
  removeImageLabel,
  emptyTitle,
  emptyDetail,
  errorTitle,
  errorDetail,
  liveLabel,
  startingLabel,
  livePreviewLabel,
  viewportRef,
  previewImageRef,
  videoRef,
  onPreviewImageLoad,
  onReset,
  inferenceResult,
  imageLayout,
  language,
  showDetectorBoxes,
  showWoundMasks,
  maskOpacity,
}: CameraPreviewFrameProps) {
  const hasPreview = Boolean(previewUrl);
  const isLive = mode === "live" || mode === "starting";
  const isError = mode === "error";

  return (
    <div className={`camera-preview-frame camera-preview-frame--${mode}`}>
      <header className="camera-preview-frame__header">
        <div className="camera-preview-frame__header-main">
          <span className="camera-preview-frame__mode">
            <span aria-hidden="true" />
            {modeLabel}
          </span>
          <span className="camera-preview-frame__file">
            <FileImage aria-hidden="true" />
            {fileName || fileNameFallback}
          </span>
        </div>
        <span className="camera-preview-frame__status">
          <span aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      <div
        ref={viewportRef}
        className={`camera-preview-frame__viewport ${hasPreview ? "has-preview" : ""}`}
      >
        <div className="camera-preview-frame__wash" aria-hidden="true" />
        <div className="camera-preview-frame__guides" aria-hidden="true">
          <span className="camera-preview-frame__ruler camera-preview-frame__ruler--x" />
          <span className="camera-preview-frame__ruler camera-preview-frame__ruler--y" />
          <span className="camera-preview-frame__reticle" />
        </div>
        <div className="camera-preview-frame__target" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        {previewUrl ? (
          <>
            <img
              ref={previewImageRef}
              className="camera-preview-frame__image"
              src={previewUrl}
              alt={previewAlt}
              onLoad={onPreviewImageLoad}
            />
            {inferenceResult && imageLayout && (
              <DetectionOverlay
                detections={inferenceResult.detections}
                regions={inferenceResult.regions}
                layout={imageLayout}
                language={language}
                showDetectorBoxes={showDetectorBoxes}
                showWoundMasks={showWoundMasks}
                maskOpacity={maskOpacity}
              />
            )}
            <div className="camera-preview-frame__image-bar">
              <span>
                <FileImage aria-hidden="true" />
                {fileName || fileNameFallback}
              </span>
              <button
                type="button"
                onClick={onReset}
                aria-label={removeImageLabel}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </>
        ) : isLive ? (
          <>
            <video
              ref={videoRef}
              className="camera-preview-frame__video"
              autoPlay
              muted
              playsInline
              aria-label={livePreviewLabel}
            />
            <div className="camera-preview-frame__live-label">
              <Video aria-hidden="true" />
              {mode === "starting" ? startingLabel : liveLabel}
            </div>
          </>
        ) : (
          <div className="camera-preview-frame__empty">
            <div className="camera-preview-frame__lens">
              <Camera aria-hidden="true" />
            </div>
            <strong>{isError ? errorTitle : emptyTitle}</strong>
            <p>{isError ? errorDetail : emptyDetail}</p>
          </div>
        )}

        {hasPreview && (
          <div className="camera-preview-frame__state-chip" role="status" aria-live="polite">
            <span aria-hidden="true" />
            {modeLabel}
          </div>
        )}
      </div>
    </div>
  );
}
