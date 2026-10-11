import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers3,
  SquareDashed,
} from "lucide-react";

export type Language = "th" | "en";
export type Detection = {
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
};
export type ClassificationResult =
  | {
      status: "ok";
      code: "BG" | "D" | "N" | "P" | "S" | "V";
      name: string;
      confidence: number;
      probabilities: Record<string, number>;
      model: "azh-classifier";
    }
  | {
      status: "unavailable" | "error";
      model: "azh-classifier";
      reason: string;
    };
export type SegmentationResult =
  | {
      status: "ok";
      model: "wound-segmentation";
      threshold: number;
      woundPixelFraction: number;
      mask: { width: 128; height: 128; encoding: "png-base64"; data: string };
    }
  | {
      status: "unavailable" | "error";
      model: "wound-segmentation";
      reason: string;
    };
export type RegionAnalysis = {
  detection: Detection;
  classification: ClassificationResult;
  segmentation: SegmentationResult;
  reviewRequired: true;
};
export type InferenceResult = {
  topSuggestion: Detection | null;
  detections: Detection[];
  regions: RegionAnalysis[];
  segmentation: {
    model: "wound-segmentation";
    version: string;
    classes: string[];
    threshold: number;
    artifactSha256?: string;
  };
  disclaimer: string;
};
export type ImageLayout = {
  naturalWidth: number;
  naturalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

const MODEL_IMAGE_SIZE = 640;
export const AZH_CODES = ["BG", "D", "N", "P", "S", "V"] as const;
export const AZH_DISPLAY_NAMES: Record<(typeof AZH_CODES)[number], string> = {
  BG: "Background",
  D: "Diabetic wound",
  N: "Normal skin",
  P: "Pressure wound",
  S: "Surgical wound",
  V: "Venous wound",
};

function detectorLabel(label: string) {
  return label.replaceAll("_", " ");
}

function percent(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function coveragePercent(value: number) {
  return (Math.max(0, Math.min(1, value)) * 100).toFixed(1);
}

export function AzhProbabilityBars({
  probabilities,
  language,
  regionIndex,
}: {
  probabilities: Record<string, number>;
  language: Language;
  regionIndex: number;
}) {
  const heading =
    language === "th"
      ? "ความน่าจะเป็นของตัวจำแนก AZH"
      : "AZH classifier probabilities";
  return (
    <div className="replica-camera-probabilities" aria-label={heading}>
      {AZH_CODES.map(code => {
        const value = probabilities[code] ?? 0;
        const valuePercent = percent(value);
        const labelId = `azh-probability-${regionIndex}-${code.toLowerCase()}`;
        return (
          <div className="replica-camera-probability" key={code}>
            <span id={labelId}>
              {code} · {AZH_DISPLAY_NAMES[code]}
            </span>
            <div
              className="replica-camera-probability-track"
              role="progressbar"
              aria-labelledby={labelId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={valuePercent}
              aria-valuetext={`${valuePercent}%`}
            >
              <span style={{ width: `${valuePercent}%` }} />
            </div>
            <strong>{valuePercent}%</strong>
          </div>
        );
      })}
    </div>
  );
}

function SegmentationResultPanel({
  segmentation,
  language,
}: {
  segmentation: SegmentationResult;
  language: Language;
}) {
  const title =
    language === "th" ? "การแบ่งพื้นที่แผล" : "Wound-area segmentation";
  if (segmentation.status === "ok") {
    const empty = segmentation.woundPixelFraction <= 0;
    return (
      <div className="replica-camera-segmentation-result">
        <span>{title}</span>
        <strong>
          {language === "th" ? "มีหน้ากากผลลัพธ์" : "Mask available"}
        </strong>
        <small>
          {language === "th" ? "เกณฑ์" : "Threshold"}{" "}
          {percent(segmentation.threshold)}% ·{" "}
          {language === "th"
            ? "ความครอบคลุมพิกเซลที่คาดการณ์"
            : "Predicted mask coverage"}
          : {coveragePercent(segmentation.woundPixelFraction)}%{" "}
          {language === "th" ? "ของกรอบตรวจจับนี้" : "of this detector crop"}
        </small>
        {empty && (
          <em>
            {language === "th"
              ? "ไม่พบพิกเซลแผลเหนือเกณฑ์"
              : "No wound pixels above threshold"}
          </em>
        )}
      </div>
    );
  }
  const unavailable = segmentation.status === "unavailable";
  return (
    <div
      className={`replica-camera-segmentation-result ${unavailable ? "is-unavailable" : "is-error"}`}
    >
      <span>{title}</span>
      <strong>
        {unavailable
          ? language === "th"
            ? "ไม่พร้อมใช้งาน"
            : "Segmentation unavailable"
          : language === "th"
            ? "เกิดข้อผิดพลาด"
            : "Segmentation error"}
      </strong>
      <small>{segmentation.reason}</small>
    </div>
  );
}

export function RegionAnalysisList({
  regions,
  language,
}: {
  regions: RegionAnalysis[];
  language: Language;
}) {
  const title =
    language === "th" ? "ผลลัพธ์แยกตามบริเวณ" : "Per-region model results";
  const regionCount =
    language === "th"
      ? `${regions.length} บริเวณ · ต้องให้ผู้เชี่ยวชาญตรวจสอบ`
      : `${regions.length} region${regions.length === 1 ? "" : "s"} · clinician review required`;
  return (
    <section
      className="replica-camera-regions"
      aria-labelledby="camera-region-analysis-heading"
      aria-live="polite"
    >
      <div className="replica-camera-regions-heading">
        <div>
          <span>
            {language === "th" ? "การวิเคราะห์ด้วยโมเดล" : "MODEL ANALYSIS"}
          </span>
          <h3 id="camera-region-analysis-heading">{title}</h3>
        </div>
        <small>{regionCount}</small>
      </div>
      <div className="replica-camera-taxonomy-note" role="note">
        <Info aria-hidden="true" />
        <div>
          <strong>
            {language === "th"
              ? "ป้ายกำกับเป็นคนละระบบ"
              : "Separate taxonomies"}
          </strong>
          <p>
            {language === "th"
              ? "ตัวตรวจจับอธิบายบริเวณที่พบ AZH อธิบายการจำแนกของภาพครอบตัด และการแบ่งพื้นที่อธิบายพิกเซลที่คาดการณ์ ป้ายกำกับเหล่านี้ไม่สามารถรวมเป็นข้อสรุปเดียวกันได้"
              : "The detector describes a visible region, AZH describes the cropped image classification, and segmentation describes predicted pixels. These outputs aren't interchangeable or a combined clinical claim."}
          </p>
        </div>
      </div>
      {regions.map((region, index) => (
        <article
          className="replica-camera-region-card"
          key={`${region.detection.label}-${index}`}
          aria-labelledby={`camera-region-${index}-heading`}
        >
          <header className="replica-camera-region-header">
            <div>
              <span>
                {language === "th"
                  ? `บริเวณที่ ${index + 1}`
                  : `REGION ${index + 1}`}
              </span>
              <strong id={`camera-region-${index}-heading`}>
                {detectorLabel(region.detection.label)}
              </strong>
            </div>
            <small>
              {language === "th" ? "กรอบตรวจจับ" : "Detector box"} ·{" "}
              {percent(region.detection.confidence)}%
            </small>
          </header>
          <div className="replica-camera-region-summary">
            <div className="replica-camera-region-model">
              <span>
                {language === "th" ? "ตัวตรวจจับ" : "Detector suggestion"}
              </span>
              <strong>{detectorLabel(region.detection.label)}</strong>
              <small>
                {language === "th" ? "ความมั่นใจ" : "Confidence"}:{" "}
                {percent(region.detection.confidence)}%
              </small>
            </div>
            <div className="replica-camera-region-model">
              <span>
                {language === "th" ? "ตัวจำแนก AZH" : "AZH classifier"}
              </span>
              {region.classification.status === "ok" ? (
                <>
                  <strong>
                    {region.classification.code} · {region.classification.name}
                  </strong>
                  <small>
                    {language === "th" ? "ความมั่นใจ" : "Confidence"}:{" "}
                    {percent(region.classification.confidence)}%
                  </small>
                </>
              ) : (
                <>
                  <strong>
                    {region.classification.status === "error"
                      ? language === "th"
                        ? "เกิดข้อผิดพลาด"
                        : "Error"
                      : language === "th"
                        ? "ไม่พร้อมใช้งาน"
                        : "Unavailable"}
                  </strong>
                  <small>{region.classification.reason}</small>
                </>
              )}
            </div>
          </div>
          {region.classification.status === "ok" && (
            <AzhProbabilityBars
              probabilities={region.classification.probabilities}
              language={language}
              regionIndex={index}
            />
          )}
          <SegmentationResultPanel
            segmentation={region.segmentation}
            language={language}
          />
          <div
            className={`replica-camera-review-status ${region.classification.status === "error" || region.segmentation.status === "error" ? "is-error" : ""}`}
          >
            <CheckCircle2 aria-hidden="true" />
            <strong>
              {language === "th"
                ? "ต้องตรวจสอบโดยผู้เชี่ยวชาญ"
                : "Review required"}
            </strong>
            <span>
              {language === "th"
                ? "ผลลัพธ์นี้เป็นข้อเสนอแนะของโมเดลเท่านั้น"
                : "This region remains a model suggestion only."}
            </span>
          </div>
          <em>
            {language === "th"
              ? "ไม่ใช่การวินิจฉัย · ต้องตรวจสอบโดยผู้เชี่ยวชาญ"
              : "Separate model suggestions only. Not a diagnosis · clinician review required."}
          </em>
        </article>
      ))}
    </section>
  );
}

export function OverlayControls({
  language,
  showDetectorBoxes,
  showWoundMasks,
  maskOpacity,
  hasMasks,
  onShowDetectorBoxesChange,
  onShowWoundMasksChange,
  onMaskOpacityChange,
}: {
  language: Language;
  showDetectorBoxes: boolean;
  showWoundMasks: boolean;
  maskOpacity: number;
  hasMasks: boolean;
  onShowDetectorBoxesChange: (value: boolean) => void;
  onShowWoundMasksChange: (value: boolean) => void;
  onMaskOpacityChange: (value: number) => void;
}) {
  return (
    <fieldset className="replica-camera-overlay-controls">
      <legend>
        {language === "th" ? "ตัวควบคุมชั้นข้อมูลภาพ" : "Overlay controls"}
      </legend>
      <label>
        <input
          type="checkbox"
          checked={showDetectorBoxes}
          onChange={event => onShowDetectorBoxesChange(event.target.checked)}
        />
        <SquareDashed aria-hidden="true" />
        <span>
          {language === "th" ? "แสดงกรอบตัวตรวจจับ" : "Show detector boxes"}
        </span>
      </label>
      <label className={!hasMasks ? "is-disabled" : ""}>
        <input
          type="checkbox"
          checked={showWoundMasks}
          disabled={!hasMasks}
          onChange={event => onShowWoundMasksChange(event.target.checked)}
        />
        <Layers3 aria-hidden="true" />
        <span>
          {language === "th"
            ? "แสดงหน้ากากพื้นที่แผล"
            : "Show wound-area masks"}
        </span>
      </label>
      <label
        className={`replica-camera-opacity ${!hasMasks ? "is-disabled" : ""}`}
      >
        <span>{language === "th" ? "ความทึบหน้ากาก" : "Mask opacity"}</span>
        <input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          value={maskOpacity}
          disabled={!hasMasks}
          onChange={event => onMaskOpacityChange(Number(event.target.value))}
          aria-valuetext={`${Math.round(maskOpacity * 100)}%`}
        />
        <strong>{Math.round(maskOpacity * 100)}%</strong>
      </label>
      <div
        className="replica-camera-overlay-legend"
        aria-label={language === "th" ? "คำอธิบายชั้นข้อมูล" : "Overlay legend"}
      >
        <span>
          <i className="is-box" />{" "}
          {language === "th" ? "กรอบตัวตรวจจับ" : "Detector boxes"}
        </span>
        <span>
          <i className="is-mask" />{" "}
          {language === "th" ? "หน้ากากการแบ่งพื้นที่" : "Segmentation masks"}
        </span>
        <span>
          <i className="is-card" />{" "}
          {language === "th" ? "การ์ดผล AZH" : "AZH result cards"}
        </span>
      </div>
      {!hasMasks && (
        <small className="replica-camera-overlay-hint">
          {language === "th"
            ? "ยังไม่มีหน้ากากที่พร้อมแสดง"
            : "No segmentation masks are available for this result."}
        </small>
      )}
    </fieldset>
  );
}

function overlayGeometry(detection: Detection, layout: ImageLayout) {
  const modelScale = Math.min(
    MODEL_IMAGE_SIZE / layout.naturalWidth,
    MODEL_IMAGE_SIZE / layout.naturalHeight
  );
  const modelOffsetX =
    (MODEL_IMAGE_SIZE - layout.naturalWidth * modelScale) / 2;
  const modelOffsetY =
    (MODEL_IMAGE_SIZE - layout.naturalHeight * modelScale) / 2;
  const displayScale = Math.min(
    layout.viewportWidth / layout.naturalWidth,
    layout.viewportHeight / layout.naturalHeight
  );
  const displayOffsetX =
    (layout.viewportWidth - layout.naturalWidth * displayScale) / 2;
  const displayOffsetY =
    (layout.viewportHeight - layout.naturalHeight * displayScale) / 2;
  return {
    left:
      displayOffsetX +
      ((detection.box.x - modelOffsetX) / modelScale) * displayScale,
    top:
      displayOffsetY +
      ((detection.box.y - modelOffsetY) / modelScale) * displayScale,
    width: (detection.box.width / modelScale) * displayScale,
    height: (detection.box.height / modelScale) * displayScale,
  };
}

export function DetectionOverlay({
  detections,
  regions = [],
  layout,
  language,
  showDetectorBoxes = true,
  showWoundMasks = true,
  maskOpacity = 0.55,
}: {
  detections: Detection[];
  regions?: RegionAnalysis[];
  layout: ImageLayout;
  language: Language;
  showDetectorBoxes?: boolean;
  showWoundMasks?: boolean;
  maskOpacity?: number;
}) {
  return (
    <div
      className="camera-detection-layer"
      aria-label={
        language === "th"
          ? "ชั้นข้อมูลผลการวิเคราะห์แผล"
          : "Wound analysis overlay"
      }
    >
      {detections.map((detection, index) => {
        const geometry = overlayGeometry(detection, layout);
        const segmentation = regions[index]?.segmentation;
        const mask =
          showWoundMasks && segmentation?.status === "ok"
            ? segmentation.mask
            : null;
        return (
          <React.Fragment key={`${detection.label}-${index}`}>
            {mask && (
              <div
                className="camera-segmentation-mask"
                style={{ ...geometry, opacity: maskOpacity }}
                aria-hidden="true"
              >
                <img
                  src={`data:image/png;base64,${mask.data}`}
                  alt=""
                  draggable={false}
                />
              </div>
            )}
            {showDetectorBoxes && (
              <div
                className="camera-detection-box"
                style={geometry}
                aria-hidden="true"
              >
                <span>
                  {detectorLabel(detection.label)} ·{" "}
                  {percent(detection.confidence)}%
                </span>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <ul
        className="camera-detection-descriptions sr-only"
        aria-label={
          language === "th"
            ? `${detections.length} ข้อเสนอแนะจากตัวตรวจจับ`
            : `${detections.length} detector suggestions`
        }
      >
        {detections.map((detection, index) => {
          const segmentation = regions[index]?.segmentation;
          const segmentationText =
            segmentation?.status === "ok"
              ? language === "th"
                ? ` หน้ากากมีอยู่ ความครอบคลุมพิกเซลที่คาดการณ์ ${coveragePercent(segmentation.woundPixelFraction)} เปอร์เซ็นต์`
                : ` segmentation mask available with ${coveragePercent(segmentation.woundPixelFraction)} percent predicted pixel coverage`
              : segmentation
                ? ` ${segmentation.status === "error" ? "segmentation error" : "segmentation unavailable"}`
                : "";
          return (
            <li key={`${detection.label}-description-${index}`}>
              {language === "th"
                ? `บริเวณที่ ${index + 1}: ข้อเสนอแนะจากตัวตรวจจับ ${detectorLabel(detection.label)} ความมั่นใจ ${percent(detection.confidence)} เปอร์เซ็นต์ กรอบอยู่ที่ x ${Math.round(detection.box.x)} y ${Math.round(detection.box.y)} กว้าง ${Math.round(detection.box.width)} สูง ${Math.round(detection.box.height)}${segmentationText}`
                : `Region ${index + 1}: detector suggestion ${detectorLabel(detection.label)}, ${percent(detection.confidence)} percent confidence, bounding box at x ${Math.round(detection.box.x)}, y ${Math.round(detection.box.y)}, width ${Math.round(detection.box.width)}, height ${Math.round(detection.box.height)}.${segmentationText}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function InconclusiveInferenceState({
  language,
  disclaimer,
}: {
  language: Language;
  disclaimer: string;
}) {
  return (
    <div
      className="replica-camera-inconclusive"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle aria-hidden="true" />
      <h3>{language === "th" ? "ยังสรุปไม่ได้" : "Inconclusive"}</h3>
      <p>
        {language === "th"
          ? "ไม่พบบริเวณที่เข้าเกณฑ์จากตัวตรวจจับ จึงไม่ได้เรียกใช้ตัวจำแนก AZH หรือการแบ่งพื้นที่กับภาพเต็ม"
          : "The detector found no qualifying region. AZH classification and segmentation weren't run on the full image."}
      </p>
      <small>{disclaimer}</small>
    </div>
  );
}
