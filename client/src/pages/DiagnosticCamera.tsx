import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2, ChevronLeft, CircleHelp, Database, FileImage, HeartPulse, ImagePlus, Info, Loader2, RefreshCcw, Search, ShieldCheck, Sparkles, Upload, UserRound, Users, Video, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import DiagnosticPhotoHistory from "@/components/DiagnosticPhotoHistory";

type CaptureState = "idle" | "preview" | "analyzing" | "ready";
type CameraState = "closed" | "starting" | "live" | "error";
type PatientContext = "all" | "type1" | "type2" | "gdm";
type InferenceResult = { topSuggestion: { label: string; confidence: number; box: { x: number; y: number; width: number; height: number } } | null; detections: Array<{ label: string; confidence: number; box: { x: number; y: number; width: number; height: number } }>; disclaimer: string };
type ImageLayout = { naturalWidth: number; naturalHeight: number; viewportWidth: number; viewportHeight: number };
const MODEL_IMAGE_SIZE = 640;
const localDateTimeValue = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

function canRequestCamera() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export default function DiagnosticCamera() {
  const { language, t } = useLanguage();
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
  const [patientSearch, setPatientSearch] = useState("");
  const [patientContext, setPatientContext] = useState<PatientContext>("all");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [assignedPatientId, setAssignedPatientId] = useState("");
  const [woundAssessmentId, setWoundAssessmentId] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const inferMutation = trpc.wound.infer.useMutation();
  const patientsQuery = trpc.diabetes.registeredPatientsPage.useQuery({ query: patientSearch, context: patientContext, offset: 0, limit: 50 }, { retry: false });
  const selectedPatientRecordQuery = trpc.diabetes.registeredPatientRecord.useQuery({ patientId: Number(assignedPatientId) }, { enabled: Boolean(assignedPatientId), retry: false });
  const savePhotoMutation = trpc.diabetes.uploadWoundPhoto.useMutation({ onSuccess: () => toast.success(t("diagnosticPhotoSaved")), onError: (error) => toast.error(error.message) });
  const patients = patientsQuery.data?.patients ?? [];
  const selectedPatient = patients.find((patient) => patient.id === Number(selectedPatientId));

  function updateImageLayout() {
    const image = previewImageRef.current;
    const viewport = viewportRef.current;
    if (!image || !viewport || !image.naturalWidth || !image.naturalHeight) return;
    const bounds = viewport.getBoundingClientRect();
    setImageLayout({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, viewportWidth: bounds.width, viewportHeight: bounds.height });
  }

  useEffect(() => {
    if (!previewUrl) { setImageLayout(null); return; }
    updateImageLayout();
    const observer = new ResizeObserver(updateImageLayout);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [previewUrl]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!helpOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setHelpOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("closed");
  }

  async function startCamera() {
    if (!canRequestCamera()) { setCameraError(t("cameraSecureContext")); setCameraState("error"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError(t("cameraUnavailable")); setCameraState("error"); return; }
    stopCamera();
    setCameraError("");
    setCameraState("starting");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      } catch (error) {
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
    clearPreviewUrl();
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name || t("uploadedWoundImage"));
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    setInferenceResult(null);
    setCapturedAt(localDateTimeValue());
    setState("preview");
  }

  function clearPreviewUrl() {
    setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
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
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) { setCameraError(t("captureError")); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setCameraError(t("captureError")); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setCameraError(t("captureError")); return; }
      clearPreviewUrl();
      void blobToDataUrl(blob).then((dataUrl) => {
        setPreviewUrl(URL.createObjectURL(blob));
        setImageDataUrl(dataUrl);
        setFileName(`wound-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`);
        setCapturedAt(localDateTimeValue());
        setInferenceResult(null);
        setState("preview");
        stopCamera();
      }).catch(() => setCameraError(t("captureError")));
    }, "image/jpeg", 0.92);
  }

  function resetCapture() {
    stopCamera();
    clearPreviewUrl();
    setImageDataUrl(null);
    setFileName("");
    setInferenceResult(null);
    setWoundAssessmentId("");
    setCapturedAt("");
    setCameraError("");
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function changePatient() {
    resetCapture();
    setSelectedPatientId("");
    setAssignedPatientId("");
    setWorkflowStarted(false);
  }

  async function beginReview() {
    if (!imageDataUrl) { setCameraError(t("captureError")); return; }
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

  function confirmPatient() {
    if (!selectedPatientId) return;
    setAssignedPatientId(selectedPatientId);
    setWorkflowStarted(true);
    setState("idle");
  }

  function saveToPatient() {
    if (!imageDataUrl || !assignedPatientId) { toast.error(t("selectPatientForPhoto")); return; }
    if (!capturedAt) { toast.error(t("selectPhotoDateTime")); return; }
    if (!selectedPatientRecordQuery.data?.patient) { toast.error(t("patientUnavailable")); return; }
    savePhotoMutation.mutate({ patientId: Number(assignedPatientId), woundAssessmentId: woundAssessmentId ? Number(woundAssessmentId) : null, fileName, mimeType: "image/jpeg", capturedAt: new Date(capturedAt).toISOString(), caption: inferenceResult?.topSuggestion ? `${t("decisionSupport")}: ${inferenceResult.topSuggestion.label.replaceAll("_", " ")}` : null, imageData: imageDataUrl });
  }

  return <DashboardLayout><div className="replica-camera-page">
    <header className="replica-camera-header"><div><Link href="/" className="replica-camera-back"><ChevronLeft aria-hidden="true" /> {t("overview")}</Link><span className="replica-camera-eyebrow"><span /> {language === "th" ? "โปรไฟล์ผู้ป่วย / ระเบียนแผล RGB" : "PATIENT PROFILE / RGB WOUND RECORD"}</span><h1>{language === "th" ? "บันทึกภาพแผล" : "Wound image capture"}</h1><p>{language === "th" ? "เลือกผู้ป่วยก่อนเริ่มบันทึกภาพ เพื่อเชื่อมผลวิเคราะห์กับระเบียนคลินิกที่ถูกต้อง" : "Select a patient before capturing an image so analysis stays linked to the correct clinical record."}</p></div><span className="replica-camera-brand">DiabCare Cam</span></header>
    {!workflowStarted ? <PatientSelector language={language} t={t} patients={patients} loading={patientsQuery.isLoading} error={patientsQuery.error} search={patientSearch} context={patientContext} selectedId={selectedPatientId} onSearch={setPatientSearch} onContext={(next) => { setPatientContext(next); setSelectedPatientId(""); }} onSelect={setSelectedPatientId} onConfirm={confirmPatient} /> : <CaptureWorkspace language={language} t={t} selectedPatient={selectedPatient} selectedPatientRecord={selectedPatientRecordQuery.data ? { ...selectedPatientRecordQuery.data.patient, woundAssessments: selectedPatientRecordQuery.data.woundAssessments } : undefined} selectedPatientRecordLoading={selectedPatientRecordQuery.isLoading} state={state} cameraState={cameraState} cameraError={cameraError} previewUrl={previewUrl} fileName={fileName} inferenceResult={inferenceResult} imageLayout={imageLayout} helpOpen={helpOpen} capturedAt={capturedAt} woundAssessmentId={woundAssessmentId} inputRef={inputRef} previewImageRef={previewImageRef} videoRef={videoRef} canvasRef={canvasRef} viewportRef={viewportRef} onPreviewImageLoad={updateImageLayout} onHelp={() => setHelpOpen((open) => !open)} onCloseHelp={() => setHelpOpen(false)} onStartCamera={startCamera} onCapture={captureFrame} onStopCamera={stopCamera} onFile={handleFile} onReset={resetCapture} onReview={beginReview} onChangePatient={changePatient} onCapturedAt={setCapturedAt} onWoundAssessment={setWoundAssessmentId} onSave={saveToPatient} saving={savePhotoMutation.isPending} />}
    <DiagnosticPhotoHistory />
  </div></DashboardLayout>;
}

type Patient = { id: number; patientCode: string; displayName: string | null; age: number | null; registrationLocation: string; identifyBy: string; type1: number; type2: number; gdm: number; sex: "FEMALE" | "MALE"; observationCount: number };
function PatientSelector({ language, t, patients, loading, error, search, context, selectedId, onSearch, onContext, onSelect, onConfirm }: { language: "th" | "en"; t: (key: string) => string; patients: Patient[]; loading: boolean; error: unknown; search: string; context: PatientContext; selectedId: string; onSearch: (value: string) => void; onContext: (value: PatientContext) => void; onSelect: (value: string) => void; onConfirm: () => void }) {
  const labels: Array<{ value: PatientContext; label: string }> = [{ value: "all", label: language === "th" ? "ทั้งหมด" : "All" }, { value: "type1", label: "Type 1" }, { value: "type2", label: "Type 2" }, { value: "gdm", label: "GDM" }];
  const errorMessage = error && typeof error === "object" && "message" in error ? String(error.message) : language === "th" ? "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" : "The connected database is unavailable";
  return <section className="replica-camera-selector panel-card" aria-labelledby="camera-patient-selector-heading"><div className="replica-camera-notice"><ShieldCheck aria-hidden="true" /><div><strong>{language === "th" ? "กรุณาเลือกผู้ป่วยก่อนเริ่มบันทึกภาพ" : "Select a patient before starting image capture"}</strong><p>{language === "th" ? "ภาพถ่ายและผลจากโมเดลจะถูกเก็บไว้กับระเบียนผู้ป่วยที่เลือก" : "The captured image and model result will stay linked to the selected patient record."}</p></div><span>RGB</span></div><div className="replica-camera-search"><Search aria-hidden="true" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={language === "th" ? "ค้นหาชื่อ รหัสผู้ป่วย หรือพื้นที่..." : "Search name, patient code, or location..."} aria-label={language === "th" ? "ค้นหาผู้ป่วย" : "Search patients"} /></div><div className="replica-camera-filter-row" role="tablist" aria-label={language === "th" ? "ตัวกรองบริบทเบาหวาน" : "Diabetes context filter"}>{labels.map((item) => <button type="button" role="tab" aria-selected={context === item.value} key={item.value} className={context === item.value ? "is-active" : ""} onClick={() => onContext(item.value)}>{item.label}</button>)}</div><div className="replica-camera-patient-heading"><div><span>{language === "th" ? "ผู้ป่วยที่ตรงตามเงื่อนไข" : "MATCHING PATIENTS"}</span><strong>{language === "th" ? "เลือกผู้ป่วยเพื่อบันทึกภาพ" : "Choose a patient for image capture"}</strong></div><small>{language === "th" ? `พบ ${patients.length} รายการ` : `${patients.length} records found`}</small></div>{loading && <div className="replica-camera-patient-loading"><span /><span /><span /></div>}{!loading && Boolean(error) && <div className="replica-camera-picker-empty is-error"><AlertTriangle aria-hidden="true" /><strong>{language === "th" ? "โหลดรายชื่อผู้ป่วยไม่สำเร็จ" : "Patients could not be loaded"}</strong><p>{errorMessage}</p></div>}{!loading && !error && !patients.length && <div className="replica-camera-picker-empty"><Search aria-hidden="true" /><strong>{language === "th" ? "ไม่พบผู้ป่วย" : "No patients found"}</strong><p>{language === "th" ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "Try a different search term or context filter."}</p></div>}{!loading && !error && patients.length > 0 && <div className="replica-camera-patient-list">{patients.map((patient) => <PatientChoice key={patient.id} patient={patient} selected={selectedId === String(patient.id)} language={language} onSelect={onSelect} />)}</div>}<button type="button" className="replica-camera-confirm" disabled={!selectedId || loading || Boolean(error)} onClick={onConfirm}><CheckCircle2 aria-hidden="true" /> {language === "th" ? "ยืนยันสิทธิ์ตรวจแผลผู้ป่วยรายนี้" : "Confirm this patient for wound capture"}</button></section>;
}
function PatientChoice({ patient, selected, language, onSelect }: { patient: Patient; selected: boolean; language: "th" | "en"; onSelect: (id: string) => void }) { return <button type="button" className={`replica-camera-patient-choice ${selected ? "is-selected" : ""}`} onClick={() => onSelect(String(patient.id))}><span className="replica-camera-patient-avatar"><UserRound aria-hidden="true" /></span><span className="replica-camera-patient-main"><strong>{patient.displayName || patient.patientCode}</strong><small>{patient.patientCode} · {patient.age === null ? (language === "th" ? "อายุไม่ระบุ" : "Age not recorded") : `${patient.age} ${language === "th" ? "ปี" : "years"}`} · {diabetesContext(patient, language)}</small><em>{patient.registrationLocation} · {patient.observationCount} {language === "th" ? "การสังเกต" : "observations"}</em></span><span className="replica-camera-patient-check">{selected ? <CheckCircle2 aria-hidden="true" /> : <span />}</span></button>; }

function CaptureWorkspace({ language, t, selectedPatient, selectedPatientRecord, selectedPatientRecordLoading, state, cameraState, cameraError, previewUrl, fileName, inferenceResult, imageLayout, helpOpen, capturedAt, woundAssessmentId, inputRef, previewImageRef, videoRef, canvasRef, viewportRef, onPreviewImageLoad, onHelp, onCloseHelp, onStartCamera, onCapture, onStopCamera, onFile, onReset, onReview, onChangePatient, onCapturedAt, onWoundAssessment, onSave, saving }: { language: "th" | "en"; t: (key: string) => string; selectedPatient?: Patient; selectedPatientRecord?: { patientCode: string; displayName: string | null; registrationLocation: string; woundAssessments?: Array<{ id: number; woundLabel: string; location: string; assessedOn: string }> }; selectedPatientRecordLoading: boolean; state: CaptureState; cameraState: CameraState; cameraError: string; previewUrl: string | null; fileName: string; inferenceResult: InferenceResult | null; imageLayout: ImageLayout | null; helpOpen: boolean; capturedAt: string; woundAssessmentId: string; inputRef: RefObject<HTMLInputElement | null>; previewImageRef: RefObject<HTMLImageElement | null>; videoRef: RefObject<HTMLVideoElement | null>; canvasRef: RefObject<HTMLCanvasElement | null>; viewportRef: RefObject<HTMLDivElement | null>; onPreviewImageLoad: () => void; onHelp: () => void; onCloseHelp: () => void; onStartCamera: () => void; onCapture: () => void; onStopCamera: () => void; onFile: (file?: File) => void; onReset: () => void; onReview: () => void; onChangePatient: () => void; onCapturedAt: (value: string) => void; onWoundAssessment: (value: string) => void; onSave: () => void; saving: boolean }) {
  return <><section className="replica-camera-selected"><div className="replica-camera-selected-icon"><UserRound aria-hidden="true" /></div><div><span>{language === "th" ? "ผู้ป่วยที่เลือก" : "SELECTED PATIENT"}</span><strong>{selectedPatientRecord?.displayName || selectedPatient?.displayName || selectedPatientRecord?.patientCode || selectedPatient?.patientCode}</strong><small>{selectedPatientRecord?.patientCode || selectedPatient?.patientCode} · {selectedPatientRecord?.registrationLocation || selectedPatient?.registrationLocation}</small></div><button type="button" onClick={onChangePatient}>{language === "th" ? "เปลี่ยนผู้ป่วย" : "Change patient"}</button></section><div className="replica-camera-workspace"><section className="replica-camera-capture panel-card" aria-labelledby="replica-camera-capture-heading"><div className="replica-camera-card-head"><div><span>{language === "th" ? "ขั้นตอนที่ 1" : "STEP 1"}</span><h2 id="replica-camera-capture-heading">{language === "th" ? "ถ่ายภาพแผล" : "Capture wound image"}</h2></div><div className="replica-camera-help-wrap"><button type="button" className="replica-camera-help" aria-label={t("cameraHelp")} aria-expanded={helpOpen} onClick={onHelp}><CircleHelp aria-hidden="true" /></button>{helpOpen && <div className="replica-camera-help-popup" role="dialog"><strong>{t("cameraHelpTitle")}</strong><p>{t("cameraHelpText")}</p><button type="button" onClick={onCloseHelp} aria-label={t("closeHelp")}><X aria-hidden="true" /></button></div>}</div></div><div ref={viewportRef} className={`replica-camera-viewport ${previewUrl ? "has-preview" : ""} ${cameraState === "live" ? "is-live" : ""}`}>{previewUrl ? <><img ref={previewImageRef} src={previewUrl} alt={t("uploadedWoundImage")} onLoad={onPreviewImageLoad} />{inferenceResult && imageLayout && <DetectionOverlay detections={inferenceResult.detections} layout={imageLayout} />}<div className="replica-camera-preview-overlay"><span><FileImage aria-hidden="true" /> {fileName}</span><button type="button" onClick={onReset} aria-label={t("removeImage")}><X aria-hidden="true" /></button></div></> : cameraState === "live" || cameraState === "starting" ? <><video ref={videoRef} className="replica-camera-live-video" autoPlay muted playsInline aria-label={t("cameraLivePreview")} /><div className="replica-camera-frame"><span /><span /><span /><span /></div><div className="replica-camera-live-label"><Video aria-hidden="true" /> {cameraState === "starting" ? t("cameraStarting") : t("cameraLive")}</div></> : <><div className="replica-camera-frame"><span /><span /><span /><span /></div><div className="replica-camera-empty"><div className="replica-camera-lens"><Camera aria-hidden="true" /></div><strong>{cameraState === "error" ? t("cameraPermission") : t("positionWound")}</strong><p>{cameraState === "error" ? cameraError : t("positionWoundDetail")}</p></div><div className="replica-camera-status"><span /> {cameraState === "error" ? t("cameraPermission") : t("cameraReady")}</div></>}</div>{cameraError && cameraState !== "error" && <div className="replica-camera-error" role="alert"><Info aria-hidden="true" /><span>{cameraError}</span></div>}<canvas ref={canvasRef} className="sr-only" aria-hidden="true" /><div className="replica-camera-actions"><input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} />{previewUrl ? <><Button onClick={onReset} variant="outline" className="replica-secondary-button"><RefreshCcw aria-hidden="true" /> {t("retake")}</Button><Button onClick={onReview} disabled={state === "analyzing"} className="replica-primary-button">{state === "analyzing" ? <><Loader2 className="animate-spin" aria-hidden="true" /> {t("preparing")}</> : <><Sparkles aria-hidden="true" /> {t("reviewImage")}</>}</Button></> : cameraState === "live" ? <><Button onClick={onCapture} className="replica-primary-button"><Camera aria-hidden="true" /> {t("capturePhoto")}</Button><Button onClick={onStopCamera} variant="outline" className="replica-secondary-button"><X aria-hidden="true" /> {t("stopCamera")}</Button></> : <><Button onClick={onStartCamera} disabled={cameraState === "starting"} className="replica-primary-button">{cameraState === "starting" ? <><Loader2 className="animate-spin" aria-hidden="true" /> {t("cameraStarting")}</> : <><Camera aria-hidden="true" /> {t("openCamera")}</>}</Button><Button onClick={() => inputRef.current?.click()} variant="outline" className="replica-secondary-button" aria-label={t("uploadImage")}><Upload aria-hidden="true" /> {t("uploadImage")}</Button></>}</div><p className="replica-camera-privacy"><ShieldCheck aria-hidden="true" /> {t("imagePrivacy")}</p></section><section className="replica-camera-analysis panel-card"><div className="replica-camera-card-head"><div><span>{language === "th" ? "ขั้นตอนที่ 2" : "STEP 2"}</span><h2>{language === "th" ? "ตรวจสอบก่อนวิเคราะห์" : "Review before analysis"}</h2></div><span className={`replica-camera-state ${state === "ready" ? "is-ready" : ""}`}>{state === "ready" ? t("ready") : t("waiting")}</span></div><div className="replica-camera-review-placeholder">{state === "idle" ? <><ImagePlus aria-hidden="true" /><strong>{t("noImageYet")}</strong><p>{t("noImageYetDetail")}</p></> : state === "analyzing" ? <><Loader2 className="animate-spin" aria-hidden="true" /><strong>{t("preparingReview")}</strong><p>{t("preparingReviewDetail")}</p></> : <><Check aria-hidden="true" /><strong>{t("imageReady")}</strong><p>{t("imageReadyDetail")}</p></>}</div>{inferenceResult && <div className="replica-camera-inference" role="status"><div><span>{t("modelSuggestion")}</span><small>{inferenceResult.detections.length} {t("detectionsFound")}</small></div>{inferenceResult.topSuggestion ? <><strong>{inferenceResult.topSuggestion.label.replaceAll("_", " ")}</strong><p>{t("confidence")}: {Math.round(inferenceResult.topSuggestion.confidence * 100)}%</p><em>{inferenceResult.disclaimer}</em></> : <><strong>{t("noDetections")}</strong><em>{inferenceResult.disclaimer}</em></>}</div>}{previewUrl && <PhotoAssignment language={language} t={t} patient={selectedPatientRecord} loading={selectedPatientRecordLoading} woundAssessmentId={woundAssessmentId} capturedAt={capturedAt} onWoundAssessment={onWoundAssessment} onCapturedAt={onCapturedAt} onSave={onSave} saving={saving} />}</section></div></>;
}

function PhotoAssignment({ language, t, patient, loading, woundAssessmentId, capturedAt, onWoundAssessment, onCapturedAt, onSave, saving }: { language: "th" | "en"; t: (key: string) => string; patient?: { patientCode: string; displayName: string | null; registrationLocation: string; woundAssessments?: Array<{ id: number; woundLabel: string; location: string; assessedOn: string }> }; loading: boolean; woundAssessmentId: string; capturedAt: string; onWoundAssessment: (value: string) => void; onCapturedAt: (value: string) => void; onSave: () => void; saving: boolean }) { const assessments = patient?.woundAssessments ?? []; return <div className="replica-camera-assignment"><div className="replica-camera-assignment-title"><Database aria-hidden="true" /><strong>{language === "th" ? "บันทึกเข้าระเบียนผู้ป่วย" : "Save to patient record"}</strong></div><p>{patient?.patientCode} · {patient?.displayName || (language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient")}</p><label><span>{t("woundAssessment")}</span><select value={woundAssessmentId} onChange={(event) => onWoundAssessment(event.target.value)} disabled={saving || loading}><option value="">{loading ? t("loadingAssessments") : t("noSpecificAssessment")}</option>{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.woundLabel} · {assessment.location} · {assessment.assessedOn}</option>)}</select></label><label><span>{t("photoDateTime")}</span><input type="datetime-local" value={capturedAt} onChange={(event) => onCapturedAt(event.target.value)} disabled={saving} /></label><Button onClick={onSave} disabled={saving || !capturedAt} className="replica-primary-button">{saving ? <><Loader2 className="animate-spin" aria-hidden="true" /> {t("savingPhoto")}</> : <><Upload aria-hidden="true" /> {t("savePhotoToPatient")}</>}</Button><small>{t("photoAssignmentNote")}</small></div>; }

function DetectionOverlay({ detections, layout }: { detections: InferenceResult["detections"]; layout: ImageLayout }) { const modelScale = Math.min(MODEL_IMAGE_SIZE / layout.naturalWidth, MODEL_IMAGE_SIZE / layout.naturalHeight); const modelOffsetX = (MODEL_IMAGE_SIZE - layout.naturalWidth * modelScale) / 2; const modelOffsetY = (MODEL_IMAGE_SIZE - layout.naturalHeight * modelScale) / 2; const displayScale = Math.min(layout.viewportWidth / layout.naturalWidth, layout.viewportHeight / layout.naturalHeight); const displayOffsetX = (layout.viewportWidth - layout.naturalWidth * displayScale) / 2; const displayOffsetY = (layout.viewportHeight - layout.naturalHeight * displayScale) / 2; return <div className="camera-detection-layer" aria-label={`${detections.length} model detections`} role="img">{detections.map((detection, index) => { const x = displayOffsetX + ((detection.box.x - modelOffsetX) / modelScale) * displayScale; const y = displayOffsetY + ((detection.box.y - modelOffsetY) / modelScale) * displayScale; const width = (detection.box.width / modelScale) * displayScale; const height = (detection.box.height / modelScale) * displayScale; return <div key={`${detection.label}-${index}`} className="camera-detection-box" style={{ left: x, top: y, width, height }} aria-label={`${detection.label.replaceAll("_", " ")} ${Math.round(detection.confidence * 100)} percent`}><span>{detection.label.replaceAll("_", " ")} · {Math.round(detection.confidence * 100)}%</span></div>; })}</div>; }

function diabetesContext(patient: { type1: number; type2: number; gdm: number }, language: "th" | "en") { if (patient.type1) return "Type 1"; if (patient.type2) return "Type 2"; if (patient.gdm) return "GDM"; return language === "th" ? "ไม่ได้บันทึก" : "Not recorded"; }
