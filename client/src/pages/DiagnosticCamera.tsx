import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Camera, Check, ChevronLeft, CircleHelp, FileImage, ImagePlus, Info, Loader2, RefreshCcw, ShieldCheck, Sparkles, Upload, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

type CaptureState = "idle" | "preview" | "analyzing" | "ready";
type CameraState = "closed" | "starting" | "live" | "error";

export default function DiagnosticCamera() {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [cameraState, setCameraState] = useState<CameraState>("closed");
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

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
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("cameraUnavailable"));
      setCameraState("error");
      return;
    }

    stopCamera();
    setCameraError("");
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
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
    setState("preview");
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
      setPreviewUrl(URL.createObjectURL(blob));
      setFileName(`wound-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`);
      setState("preview");
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  function resetCapture() {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName("");
    setCameraError("");
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function beginReview() {
    setState("analyzing");
    window.setTimeout(() => setState("ready"), 900);
  }

  return <DashboardLayout><div className="camera-page">
    <header className="camera-page-header"><div><Link href="/" className="camera-back"><ChevronLeft className="h-4 w-4" /> {t("overview")}</Link><div className="camera-eyebrow"><span /> {t("woundcam")} / {t("cameraWorkflow")}</div><h1>{t("cameraTitle")}</h1><p>{t("cameraSubtitle")}</p></div><div className="camera-header-badge"><ShieldCheck className="h-4 w-4" /> {t("localOnly")}</div></header>

    <div className="camera-workspace">
      <section className="camera-capture-card panel-card" aria-labelledby="capture-heading">
        <div className="camera-card-header"><div><p className="camera-kicker">{t("stepOne")}</p><h2 id="capture-heading">{t("captureImage")}</h2></div><button type="button" className="camera-help" aria-label={t("cameraHelp")} onClick={() => window.alert(t("cameraHelpText"))}><CircleHelp className="h-4 w-4" /></button></div>
        <div className={`camera-viewport ${previewUrl ? "has-preview" : ""} ${cameraState === "live" ? "is-live" : ""}`}>
          {previewUrl ? <><img src={previewUrl} alt={t("uploadedWoundImage")} /><div className="camera-preview-overlay"><span><FileImage className="h-4 w-4" /> {fileName}</span><button type="button" onClick={resetCapture} aria-label={t("removeImage")}><X className="h-4 w-4" /></button></div></> : cameraState === "live" || cameraState === "starting" ? <><video ref={videoRef} className="camera-live-video" autoPlay muted playsInline aria-label={t("cameraLivePreview")} /><div className="camera-frame-guides"><span /><span /><span /><span /></div><div className="camera-live-label"><Video className="h-3.5 w-3.5" /> {cameraState === "starting" ? t("cameraStarting") : t("cameraLive")}</div></> : <><div className="camera-frame-guides"><span /><span /><span /><span /></div><div className="camera-empty"><div className="camera-lens"><Camera className="h-7 w-7" /></div><strong>{cameraState === "error" ? t("cameraPermission") : t("positionWound")}</strong><p>{cameraState === "error" ? cameraError : t("positionWoundDetail")}</p></div><div className="camera-status"><span className="camera-status-dot" /> {cameraState === "error" ? t("cameraPermission") : t("cameraReady")}</div></>}
        </div>
        {cameraError && cameraState !== "error" && <div className="camera-error" role="alert"><Info className="h-4 w-4" /><span>{cameraError}</span></div>}
        <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
        <div className="camera-capture-actions"><input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />{previewUrl ? <><Button onClick={resetCapture} variant="outline" className="h-11 flex-1 rounded-xl border-slate-200"><RefreshCcw className="mr-2 h-4 w-4" /> {t("retake")}</Button><Button onClick={beginReview} disabled={state === "analyzing"} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]">{state === "analyzing" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("preparing")}</> : <><Sparkles className="mr-2 h-4 w-4" /> {t("reviewImage")}</>}</Button></> : cameraState === "live" ? <><Button onClick={captureFrame} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]"><Camera className="mr-2 h-4 w-4" /> {t("capturePhoto")}</Button><Button onClick={stopCamera} variant="outline" className="h-11 rounded-xl border-slate-200 px-4"><X className="mr-2 h-4 w-4" /> {t("stopCamera")}</Button></> : <><Button onClick={startCamera} disabled={cameraState === "starting"} className="h-11 flex-1 rounded-xl bg-[#132238] text-white hover:bg-[#223750]">{cameraState === "starting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("cameraStarting")}</> : <><Camera className="mr-2 h-4 w-4" /> {t("openCamera")}</>}</Button><Button onClick={() => inputRef.current?.click()} variant="outline" className="h-11 rounded-xl border-slate-200 px-4" aria-label={t("uploadImage")}><Upload className="h-4 w-4" /></Button></>}</div>
        <div className="camera-trust-note"><ShieldCheck className="h-4 w-4" /><span>{t("imagePrivacy")}</span></div>
      </section>

      <aside className="camera-review-column" aria-label={t("cameraReviewPanel")}>
        <section className="camera-guidance-card panel-card"><div className="camera-card-header"><div><p className="camera-kicker">{t("beforeYouCapture")}</p><h2>{t("imageGuidance")}</h2></div><Info className="h-4 w-4 text-[#79a58c]" /></div><ul className="camera-checklist"><ChecklistItem done={false} text={t("guidanceLight")} /><ChecklistItem done={false} text={t("guidanceFocus")} /><ChecklistItem done={false} text={t("guidanceDistance")} /><ChecklistItem done={false} text={t("guidanceClean")} /></ul><div className="camera-guidance-tip"><Sparkles className="h-4 w-4" /><p>{t("guidanceTip")}</p></div></section>
        <section className="camera-analysis-card panel-card"><div className="camera-card-header"><div><p className="camera-kicker">{t("stepTwo")}</p><h2>{t("reviewBeforeAnalysis")}</h2></div><span className={`camera-state-pill ${state === "ready" ? "is-ready" : ""}`}>{state === "ready" ? t("ready") : t("waiting")}</span></div><div className="camera-review-placeholder">{state === "idle" ? <><ImagePlus className="h-6 w-6" /><strong>{t("noImageYet")}</strong><p>{t("noImageYetDetail")}</p></> : state === "analyzing" ? <><Loader2 className="h-6 w-6 animate-spin" /><strong>{t("preparingReview")}</strong><p>{t("preparingReviewDetail")}</p></> : <><Check className="h-6 w-6 text-[#4f8b68]" /><strong>{t("imageReady")}</strong><p>{t("imageReadyDetail")}</p></>}</div><div className="camera-disclaimer"><ShieldCheck className="h-4 w-4" /><p>{t("diagnosticDisclaimer")}</p></div></section>
      </aside>
    </div>

    <section className="camera-bottom-row"><div className="camera-process-card"><div className="camera-process-step is-active"><span>1</span><div><strong>{t("captureImage")}</strong><small>{t("captureStepDetail")}</small></div></div><div className="camera-process-line" /><div className={`camera-process-step ${state === "ready" ? "is-active" : ""}`}><span>2</span><div><strong>{t("reviewImage")}</strong><small>{t("reviewStepDetail")}</small></div></div><div className="camera-process-line" /><div className="camera-process-step"><span>3</span><div><strong>{t("clinicalDecision")}</strong><small>{t("clinicalDecisionDetail")}</small></div></div></div><button type="button" className="camera-secondary-link" onClick={() => window.alert(t("comingSoon"))}>{t("viewCaptureHistory")}</button></section>
  </div></DashboardLayout>;
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) { return <li><span className={done ? "is-done" : ""}>{done ? <Check className="h-3 w-3" /> : <span />}</span><p>{text}</p></li>; }
