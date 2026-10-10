import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

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
export type RegionAnalysis = {
  detection: Detection;
  classification: ClassificationResult;
  reviewRequired: true;
};
export type InferenceResult = {
  topSuggestion: Detection | null;
  detections: Detection[];
  regions: RegionAnalysis[];
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
              ? "ตัวตรวจจับอธิบายบริเวณที่พบ ส่วน AZH อธิบายการจำแนกของภาพครอบตัด ป้ายกำกับทั้งสองไม่สามารถเทียบหรือรวมเป็นข้อสรุปเดียวกันได้"
              : "The detector describes a visible region. AZH describes the cropped image classification. These labels aren't interchangeable or a combined clinical claim."}
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
          <div
            className={`replica-camera-review-status ${region.classification.status === "error" ? "is-error" : ""}`}
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
          ? "ไม่พบบริเวณที่เข้าเกณฑ์จากตัวตรวจจับ จึงไม่ได้เรียกใช้ตัวจำแนก AZH กับภาพเต็ม"
          : "The detector found no qualifying region. The AZH classifier wasn't run on the full image."}
      </p>
      <small>{disclaimer}</small>
    </div>
  );
}

export function DetectionOverlay({
  detections,
  layout,
  language,
}: {
  detections: Detection[];
  layout: ImageLayout;
  language: Language;
}) {
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
  return (
    <div className="camera-detection-layer">
      {detections.map((detection, index) => {
        const x =
          displayOffsetX +
          ((detection.box.x - modelOffsetX) / modelScale) * displayScale;
        const y =
          displayOffsetY +
          ((detection.box.y - modelOffsetY) / modelScale) * displayScale;
        const width = (detection.box.width / modelScale) * displayScale;
        const height = (detection.box.height / modelScale) * displayScale;
        return (
          <div
            key={`${detection.label}-${index}`}
            className="camera-detection-box"
            style={{ left: x, top: y, width, height }}
            aria-hidden="true"
          >
            <span>
              {detectorLabel(detection.label)} · {percent(detection.confidence)}
              %
            </span>
          </div>
        );
      })}
      <ul
        className="camera-detection-descriptions sr-only"
        aria-label={`${detections.length} detector suggestions`}
      >
        {detections.map((detection, index) => (
          <li key={`${detection.label}-description-${index}`}>
            {language === "th"
              ? `บริเวณที่ ${index + 1}: ข้อเสนอแนะจากตัวตรวจจับ ${detectorLabel(detection.label)} ความมั่นใจ ${percent(detection.confidence)} เปอร์เซ็นต์ กรอบอยู่ที่ x ${Math.round(detection.box.x)} y ${Math.round(detection.box.y)} กว้าง ${Math.round(detection.box.width)} สูง ${Math.round(detection.box.height)}`
              : `Region ${index + 1}: detector suggestion ${detectorLabel(detection.label)}, ${percent(detection.confidence)} percent confidence, bounding box at x ${Math.round(detection.box.x)}, y ${Math.round(detection.box.y)}, width ${Math.round(detection.box.width)}, height ${Math.round(detection.box.height)}.`}
          </li>
        ))}
      </ul>
    </div>
  );
}
