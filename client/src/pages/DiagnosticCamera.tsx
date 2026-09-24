import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Camera, Check, ChevronLeft, CircleHelp, FileImage, ImagePlus, Info, Loader2, RefreshCcw, ShieldCheck, Sparkles, Upload, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

type CaptureState = "idle" | "preview" | "analyzing" | "ready";
type CameraState = "closed" | "starting" | "live" | "error";
type InferenceResult = { topSuggestion: { label: string; confidence: number; box: { x: number; y: number; width: number; height: number } } | null; detections: Array<{ label: string; confidence: number; box: { x: number; y: number; width: number; height: number } }>; disclaimer: string };
type ImageLayout = { naturalWidth: number; naturalHeight: number; viewportWidth: number; viewportHeight: number };
const MODEL_IMAGE_SIZE = 640;

function canRequestCamera() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export default function DiagnosticCamera() {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("closed");
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [imageLayout, setImageLayout] = useState<ImageLayout | null>(null);
  const inferMutation = trpc.wound.infer.useMutation();

  function updateImageLayout() {
    const image = previewImageRef.current;
    const viewport = viewportRef.current;
    if (!image || !viewport || !image.naturalWidth || !image.naturalHeight) return;
    const bounds = viewport.getBoundingClientRect();
    setImageLayout({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, viewportWidth: bounds.width, viewportHeight: bounds.height });
  }

  useEffect(() => {
    if (!previewUrl) {
      setImageLayout(null);
      return;
    }
    updateImageLayout();
    const observer = new ResizeObserver(updateImageLayout);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [previewUrl]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("closed");
  }

  useEffect(() => () => {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function startCamera() {
    if (!canRequestCamera()) {
      setCameraError(t("cameraSecureContext"));
      setCameraState("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("cameraUnavailable"));
      setCameraState("error");
      return;
    }

    stopCamera();
    setCameraError("");
    setCameraState("starting");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (error) {
        // Some mobile browsers reject ideal facingMode/size constraints even
        // though they can provide a camera. Retry with the minimal contract.
        if (!(error instanceof DOMException) || error.name !== "OverconstrainedError") throw error;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is unavailable");
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        const onMetadata = () => { video.removeEventListener("loadedmetadata", onMetadata); resolve(); };
        video.addEventListener("loadedmetadata", onMetadata, { once: true });
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();
      });
      await video.play();
      setCameraState("live");
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setCameraError(denied ? t("cameraPermissionDenied") : t("cameraUnavailable"));
      setCameraState("error");
    }
  }

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name || t("uploadedWoundImage"));
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    setInferenceResult(null);
    setState("preview");
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read captured image"));
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read captured image"));
      reader.readAsDataURL(blob);
    });
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setCameraError(t("captureError"));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(t("captureError"));
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError(t("captureError"));
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      void blobToDataUrl(blob).then((dataUrl) => {
        setPreviewUrl(URL.createObjectURL(blob));
        setImageDataUrl(dataUrl);
        setFileName(`wound-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`);
        setInferenceResult(null);
        setState("preview");
        stopCamera();
      }).catch(() => setCameraError(t("captureError")));
    }, "image/jpeg", 0.92);
  }

  function resetCapture() {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageDataUrl(null);
    setFileName("");
    setInferenceResult(null);
    setCameraError("");
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function beginReview() {
    if (!imageDataUrl) {
      setCameraError(t("captureError"));
      return;
    }
    setState("analyzing");
    setCameraError("");
    try {
      const result = await inferMutation.mutateAsync({ imageData: imageDataUrl, confidence: 0.25 });
      setInferenceResult(result);
      setState("ready");
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : t("inferenceError"));
      setState("preview");
    }
  }

  return <DashboardLayout><div className="camera-page">
    <header className="camera-page-header"><div><Link href="/" className="camera-back"><ChevronLeft className="h-4 w-4" /> {t("overview")}</Link><div className="camera-eyebrow"><span /> {t("woundcam")} / {t("cameraWorkflow")}</div><h1>{t("cameraTitle")}</h1><p>{t("cameraSubtitle")}</p></div><div className="camera-header-badge"><ShieldCheck className="h-4 w-4" /> {t("localOnly")}</div></header>

    <div className="camera-workspace">
      <section className="camera-capture-card panel-card" aria-labelledby="capture-heading">
        <div className="camera-card-header"><div><p className="camera-kicker">{t("stepOne")}</p><h2 id="capture-heading">{t("captureImage")}</h2></div><button type="button" className="camera-help" aria-label={t("cameraHelp")} onClick={() => window.alert(t("cameraHelpText"))}><CircleHelp className="h-4 w-4" /></button></div>
        <div ref={viewportRef} className={`camera-viewport ${previewUrl ? "has-preview" : ""} ${cameraState === "live" ? "is-live" : ""}`}>
          {previewUrl ? <><img ref={previewImageRef} src={previewUrl} alt={t("uploadedWoundImage")} onLoad={updateImageLayout} />{inferenceResult && imageLayout && <DetectionOverlay detections={inferenceResult.detections} layout={imageLayout} /> }<div className="camera-preview-overlay"><span><FileImage className="h-4 w-4" /> {fileName}</span><button type="button" onClick={resetCapture} aria-label={t("removeImage")}><X className="h-4 w-4" /></button></div></> : cameraState === "live" || cameraState === "starting" ? <><video ref={videoRef} className="camera-live-video" autoPlay muted playsInline aria-label={t("cameraLivePreview")} /><div className="camera-frame-guides"><span /><span /><span /><span /></div><div className="camera-live-label"><Video className="h-3.5 w-3.5" /> {cameraState === "starting" ? t("cameraStarting") : t("cameraLive")}</div></> : <><div className="camera-frame-guides"><span /><span /><span /><span /></div><div className="camera-empty"><div className="camera-lens"><Camera className="h-7 w-7" /></div><strong>{cameraState === "error" ? t("cameraPermission") : t("positionWound")}</strong><p>{cameraState === "error" ? cameraError : t("positionWoundDetail")}</p></div><div className="camera-status"><span className="camera-status-dot" /> {cameraState === "error" ? t("cameraPermission") : t("cameraReady")}</div></>}
        </div>
        {cameraError && cameraState !== "error" && <div className="camera-error" role="alert"><Info className="h-4 w-4" /><span>{cameraError}</span></div>}
        <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
        <div className="camera-capture-actions"><input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />{previewUrl ? <><Button onClick={resetCapture} variant="outline" className="h-11 flex-1 rounded-xl border-slate-200"><RefreshCcw className="mr-2 h-4 w-4" /> {t("retake")}</Button><Button onClick={beginReview} disabled={state === "analyzing"} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]">{state === "analyzing" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("preparing")}</> : <><Sparkles className="mr-2 h-4 w-4" /> {t("reviewImage")}</>}</Button></> : cameraState === "live" ? <><Button onClick={captureFrame} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]"><Camera className="mr-2 h-4 w-4" /> {t("capturePhoto")}</Button><Button onClick={stopCamera} variant="outline" className="h-11 rounded-xl border-slate-200 px-4"><X className="mr-2 h-4 w-4" /> {t("stopCamera")}</Button></> : <><Button onClick={startCamera} disabled={cameraState === "starting"} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]">{cameraState === "starting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("cameraStarting")}</> : <><Camera className="mr-2 h-4 w-4" /> {t("openCamera")}</>}</Button><Button onClick={() => inputRef.current?.click()} variant="outline" className="h-11 rounded-xl border-slate-200 px-4" aria-label={t("uploadImage")}><Upload className="h-4 w-4" /></Button></>}</div>
        <div className="camera-trust-note"><ShieldCheck className="h-4 w-4" /><span>{t("imagePrivacy")}</span></div>
      </section>

      <aside className="camera-review-column" aria-label={t("cameraReviewPanel")}>
        <section className="camera-guidance-card panel-card"><div className="camera-card-header"><div><p className="camera-kicker">{t("beforeYouCapture")}</p><h2>{t("imageGuidance")}</h2></div><Info className="h-4 w-4 text-[#79a58c]" /></div><ul className="camera-checklist"><ChecklistItem done={false} text={t("guidanceLight")} /><ChecklistItem done={false} text={t("guidanceFocus")} /><ChecklistItem done={false} text={t("guidanceDistance")} /><ChecklistItem done={false} text={t("guidanceClean")} /></ul><div className="camera-guidance-tip"><Sparkles className="h-4 w-4" /><p>{t("guidanceTip")}</p></div></section>
        <section className="camera-analysis-card panel-card"><div className="camera-card-header"><div><p className="camera-kicker">{t("stepTwo")}</p><h2>{t("reviewBeforeAnalysis")}</h2></div><span className={`camera-state-pill ${state === "ready" ? "is-ready" : ""}`}>{state === "ready" ? t("ready") : t("waiting")}</span></div><div className="camera-review-placeholder">{state === "idle" ? <><ImagePlus className="h-6 w-6" /><strong>{t("noImageYet")}</strong><p>{t("noImageYetDetail")}</p></> : state === "analyzing" ? <><Loader2 className="h-6 w-6 animate-spin" /><strong>{t("preparingReview")}</strong><p>{t("preparingReviewDetail")}</p></> : <><Check className="h-6 w-6 text-[#4f8b68]" /><strong>{t("imageReady")}</strong><p>{t("imageReadyDetail")}</p></>}</div>{inferenceResult && <div className="camera-inference-result" role="status"><div className="camera-inference-heading"><span>{t("modelSuggestion")}</span><span>{inferenceResult.detections.length} {t("detectionsFound")}</span></div>{inferenceResult.topSuggestion ? <><strong>{inferenceResult.topSuggestion.label.replaceAll("_", " ")}</strong><p>{t("confidence")}: {Math.round(inferenceResult.topSuggestion.confidence * 100)}%</p><small>{inferenceResult.disclaimer}</small></> : <><strong>{t("noDetections")}</strong><p>{inferenceResult.disclaimer}</p></>}</div>}<div className="camera-disclaimer"><ShieldCheck className="h-4 w-4" /><p>{t("diagnosticDisclaimer")}</p></div></section>
      </aside>
    </div>

    <section className="camera-bottom-row"><div className="camera-process-card"><div className="camera-process-step is-active"><span>1</span><div><strong>{t("captureImage")}</strong><small>{t("captureStepDetail")}</small></div></div><div className="camera-process-line" /><div className={`camera-process-step ${state === "ready" ? "is-active" : ""}`}><span>2</span><div><strong>{t("reviewImage")}</strong><small>{t("reviewStepDetail")}</small></div></div><div className="camera-process-line" /><div className="camera-process-step"><span>3</span><div><strong>{t("clinicalDecision")}</strong><small>{t("clinicalDecisionDetail")}</small></div></div></div><button type="button" className="camera-secondary-link" onClick={() => window.alert(t("comingSoon"))}>{t("viewCaptureHistory")}</button></section>
  </div></DashboardLayout>;
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) { return <li><span className={done ? "is-done" : ""}>{done ? <Check className="h-3 w-3" /> : <span />}</span><p>{text}</p></li>; }

function DetectionOverlay({ detections, layout }: { detections: InferenceResult["detections"]; layout: ImageLayout }) {
  const modelScale = Math.min(MODEL_IMAGE_SIZE / layout.naturalWidth, MODEL_IMAGE_SIZE / layout.naturalHeight);
  const modelOffsetX = (MODEL_IMAGE_SIZE - layout.naturalWidth * modelScale) / 2;
  const modelOffsetY = (MODEL_IMAGE_SIZE - layout.naturalHeight * modelScale) / 2;
  const displayScale = Math.min(layout.viewportWidth / layout.naturalWidth, layout.viewportHeight / layout.naturalHeight);
  const displayOffsetX = (layout.viewportWidth - layout.naturalWidth * displayScale) / 2;
  const displayOffsetY = (layout.viewportHeight - layout.naturalHeight * displayScale) / 2;

  return <div className="camera-detection-layer" aria-label={`${detections.length} model detections`} role="img">
    {detections.map((detection, index) => {
      const x = displayOffsetX + ((detection.box.x - modelOffsetX) / modelScale) * displayScale;
      const y = displayOffsetY + ((detection.box.y - modelOffsetY) / modelScale) * displayScale;
      const width = (detection.box.width / modelScale) * displayScale;
      const height = (detection.box.height / modelScale) * displayScale;
      return <div key={`${detection.label}-${index}`} className="camera-detection-box" style={{ left: x, top: y, width, height }} aria-label={`${detection.label.replaceAll("_", " ")} ${Math.round(detection.confidence * 100)} percent`}><span>{detection.label.replaceAll("_", " ")} · {Math.round(detection.confidence * 100)}%</span></div>;
    })}
  </div>;
}
