import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Database,
  FileImage,
  HeartPulse,
  ImagePlus,
  Info,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import DiagnosticPhotoHistory from "@/components/DiagnosticPhotoHistory";
import {
  DetectionOverlay,
  InconclusiveInferenceState,
  OverlayControls,
  RegionAnalysisList,
  type ImageLayout,
  type InferenceResult,
} from "@/components/WoundInferenceResults";
import "@/styles/clinical-tokens.css";
import "@/styles/camera-redesign.css";

type CaptureState = "idle" | "preview" | "analyzing" | "ready";
type CameraState = "closed" | "starting" | "live" | "error";
type PatientContext = "all" | "type1" | "type2" | "gdm";

const localDateTimeValue = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

function canRequestCamera() {
  if (typeof window === "undefined") return false;
  return (
    window.isSecureContext ||
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
  );
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
  const [inferenceResult, setInferenceResult] =
    useState<InferenceResult | null>(null);
  const [showDetectorBoxes, setShowDetectorBoxes] = useState(true);
  const [showWoundMasks, setShowWoundMasks] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(0.55);
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
  const patientsQuery = trpc.diabetes.registeredPatientsPage.useQuery(
    { query: patientSearch, context: patientContext, offset: 0, limit: 50 },
    { retry: false }
  );
  const selectedPatientRecordQuery =
    trpc.diabetes.registeredPatientRecord.useQuery(
      { patientId: Number(assignedPatientId) },
      { enabled: Boolean(assignedPatientId), retry: false }
    );
  const savePhotoMutation = trpc.diabetes.uploadWoundPhoto.useMutation({
    onSuccess: () => toast.success(t("diagnosticPhotoSaved")),
    onError: error => toast.error(error.message),
  });
  const patients = patientsQuery.data?.patients ?? [];
  const selectedPatient = patients.find(
    patient => patient.id === Number(selectedPatientId)
  );
  const activeWorkflowStep = !workflowStarted ? 1 : previewUrl ? 3 : 2;

  function updateImageLayout() {
    const image = previewImageRef.current;
    const viewport = viewportRef.current;
    if (!image || !viewport || !image.naturalWidth || !image.naturalHeight)
      return;
    const bounds = viewport.getBoundingClientRect();
    setImageLayout({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      viewportWidth: bounds.width,
      viewportHeight: bounds.height,
    });
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

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!helpOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("closed");
  }

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
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (error) {
        if (
          !(error instanceof DOMException) ||
          error.name !== "OverconstrainedError"
        )
          throw error;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is unavailable");
      video.srcObject = stream;
      await new Promise<void>(resolve => {
        const onMetadata = () => {
          video.removeEventListener("loadedmetadata", onMetadata);
          resolve();
        };
        video.addEventListener("loadedmetadata", onMetadata, { once: true });
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();
      });
      await video.play();
      setCameraState("live");
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      setCameraError(
        denied ? t("cameraPermissionDenied") : t("cameraUnavailable")
      );
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
    reader.onload = () =>
      setImageDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    setInferenceResult(null);
    setCapturedAt(localDateTimeValue());
    setState("preview");
  }

  function clearPreviewUrl() {
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read captured image"));
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Unable to read captured image"));
      reader.readAsDataURL(blob);
    });
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth
    ) {
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
    canvas.toBlob(
      blob => {
        if (!blob) {
          setCameraError(t("captureError"));
          return;
        }
        clearPreviewUrl();
        void blobToDataUrl(blob)
          .then(dataUrl => {
            setPreviewUrl(URL.createObjectURL(blob));
            setImageDataUrl(dataUrl);
            setFileName(
              `wound-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`
            );
            setCapturedAt(localDateTimeValue());
            setInferenceResult(null);
            setState("preview");
            stopCamera();
          })
          .catch(() => setCameraError(t("captureError")));
      },
      "image/jpeg",
      0.92
    );
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
    if (!imageDataUrl) {
      setCameraError(t("captureError"));
      return;
    }
    setState("analyzing");
    setCameraError("");
    try {
      const result = await inferMutation.mutateAsync({
        imageData: imageDataUrl,
        confidence: 0.25,
      });
      setInferenceResult(result);
      setState("ready");
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : t("inferenceError")
      );
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
    if (!imageDataUrl || !assignedPatientId) {
      toast.error(t("selectPatientForPhoto"));
      return;
    }
    if (!capturedAt) {
      toast.error(t("selectPhotoDateTime"));
      return;
    }
    if (!selectedPatientRecordQuery.data?.patient) {
      toast.error(t("patientUnavailable"));
      return;
    }
    savePhotoMutation.mutate({
      patientId: Number(assignedPatientId),
      woundAssessmentId: woundAssessmentId ? Number(woundAssessmentId) : null,
      fileName,
      mimeType: "image/jpeg",
      capturedAt: new Date(capturedAt).toISOString(),
      caption: inferenceResult?.topSuggestion
        ? `${t("decisionSupport")}: ${inferenceResult.topSuggestion.label.replaceAll("_", " ")}`
        : null,
      imageData: imageDataUrl,
    });
  }

  return (
    <DashboardLayout>
      <div className="camera-v2-page">
        <header className="camera-v2-header">
          <div>
            <Link href="/" className="camera-v2-back">
              <ChevronLeft aria-hidden="true" /> {t("overview")}
            </Link>
            <span className="camera-v2-eyebrow">
              <span />
              {language === "th"
                ? "โปรไฟล์ผู้ป่วย / ระเบียนแผล RGB"
                : "PATIENT PROFILE / RGB WOUND RECORD"}
            </span>
            <h1>
              {language === "th" ? "บันทึกภาพแผล" : "Wound image capture"}
            </h1>
            <p>
              {language === "th"
                ? "เลือกผู้ป่วยก่อนเริ่มบันทึกภาพ เพื่อเชื่อมผลวิเคราะห์กับระเบียนคลินิกที่ถูกต้อง"
                : "Select a patient before capturing an image so analysis stays linked to the correct clinical record."}
            </p>
          </div>
          <div className="camera-v2-header-meta">
            <span className="camera-v2-protected-badge">
              <ShieldCheck aria-hidden="true" />
              {language === "th"
                ? "พื้นที่ข้อมูลปลอดภัย"
                : "Protected clinical workspace"}
            </span>
            <span className="camera-v2-product-mark">
              <img src="/assets/diabcare-logo.jpg" alt="" />
              DiabCare Cam
            </span>
          </div>
        </header>

        <nav className="camera-v2-stepper" aria-label="Wound capture workflow">
          <WorkflowStep
            number="01"
            title={language === "th" ? "เลือกผู้ป่วย" : "Choose patient"}
            detail={language === "th" ? "เชื่อมระเบียน" : "Link the record"}
            status={activeWorkflowStep > 1 ? "complete" : "active"}
          />
          <WorkflowStep
            number="02"
            title={language === "th" ? "บันทึกหลักฐาน" : "Capture evidence"}
            detail={language === "th" ? "ภาพแผล RGB" : "RGB wound image"}
            status={
              activeWorkflowStep === 2
                ? "active"
                : activeWorkflowStep > 2
                  ? "complete"
                  : "upcoming"
            }
          />
          <WorkflowStep
            number="03"
            title={language === "th" ? "ตรวจสอบและบันทึก" : "Review & save"}
            detail={language === "th" ? "บุคลากรยืนยัน" : "Clinician verified"}
            status={activeWorkflowStep === 3 ? "active" : "upcoming"}
          />
        </nav>

        {!workflowStarted ? (
          <PatientSelector
            language={language}
            t={t}
            patients={patients}
            loading={patientsQuery.isLoading}
            error={patientsQuery.error}
            search={patientSearch}
            context={patientContext}
            selectedId={selectedPatientId}
            onSearch={setPatientSearch}
            onContext={next => {
              setPatientContext(next);
              setSelectedPatientId("");
            }}
            onSelect={setSelectedPatientId}
            onConfirm={confirmPatient}
          />
        ) : (
          <CaptureWorkspace
            language={language}
            t={t}
            selectedPatient={selectedPatient}
            selectedPatientRecord={
              selectedPatientRecordQuery.data
                ? {
                    ...selectedPatientRecordQuery.data.patient,
                    woundAssessments:
                      selectedPatientRecordQuery.data.woundAssessments,
                  }
                : undefined
            }
            selectedPatientRecordLoading={selectedPatientRecordQuery.isLoading}
            state={state}
            cameraState={cameraState}
            cameraError={cameraError}
            previewUrl={previewUrl}
            fileName={fileName}
            inferenceResult={inferenceResult}
            imageLayout={imageLayout}
            helpOpen={helpOpen}
            capturedAt={capturedAt}
            woundAssessmentId={woundAssessmentId}
            inputRef={inputRef}
            previewImageRef={previewImageRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            viewportRef={viewportRef}
            onPreviewImageLoad={updateImageLayout}
            onHelp={() => setHelpOpen(open => !open)}
            onCloseHelp={() => setHelpOpen(false)}
            onStartCamera={startCamera}
            onCapture={captureFrame}
            onStopCamera={stopCamera}
            onFile={handleFile}
            onReset={resetCapture}
            onReview={beginReview}
            onChangePatient={changePatient}
            onCapturedAt={setCapturedAt}
            onWoundAssessment={setWoundAssessmentId}
            onSave={saveToPatient}
            saving={savePhotoMutation.isPending}
            showDetectorBoxes={showDetectorBoxes}
            showWoundMasks={showWoundMasks}
            maskOpacity={maskOpacity}
            onShowDetectorBoxesChange={setShowDetectorBoxes}
            onShowWoundMasksChange={setShowWoundMasks}
            onMaskOpacityChange={setMaskOpacity}
          />
        )}
        <DiagnosticPhotoHistory />
      </div>
    </DashboardLayout>
  );
}

type WorkflowStatus = "active" | "complete" | "upcoming";

function WorkflowStep({
  number,
  title,
  detail,
  status,
}: {
  number: string;
  title: string;
  detail: string;
  status: WorkflowStatus;
}) {
  return (
    <div
      className={`camera-v2-step camera-v2-step-${status}`}
      aria-current={status === "active" ? "step" : undefined}
    >
      <span className="camera-v2-step-number">
        {status === "complete" ? <Check aria-hidden="true" /> : number}
      </span>
      <span className="camera-v2-step-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

type Patient = {
  id: number;
  patientCode: string;
  displayName: string | null;
  age: number | null;
  registrationLocation: string;
  identifyBy: string;
  type1: number;
  type2: number;
  gdm: number;
  sex: "FEMALE" | "MALE";
  observationCount: number;
};

function PatientSelector({
  language,
  t,
  patients,
  loading,
  error,
  search,
  context,
  selectedId,
  onSearch,
  onContext,
  onSelect,
  onConfirm,
}: {
  language: "th" | "en";
  t: (key: string) => string;
  patients: Patient[];
  loading: boolean;
  error: unknown;
  search: string;
  context: PatientContext;
  selectedId: string;
  onSearch: (value: string) => void;
  onContext: (value: PatientContext) => void;
  onSelect: (value: string) => void;
  onConfirm: () => void;
}) {
  const labels: Array<{ value: PatientContext; label: string }> = [
    { value: "all", label: language === "th" ? "ทั้งหมด" : "All" },
    { value: "type1", label: "Type 1" },
    { value: "type2", label: "Type 2" },
    { value: "gdm", label: "GDM" },
  ];
  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : language === "th"
        ? "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
        : "The connected database is unavailable";
  const selectedPatient = patients.find(
    patient => String(patient.id) === selectedId
  );

  return (
    <section
      className="camera-v2-panel camera-v2-selector"
      aria-labelledby="camera-patient-selector-heading"
    >
      <header className="camera-v2-panel-header">
        <div>
          <span className="camera-v2-kicker">01 / Before capture</span>
          <h2 id="camera-patient-selector-heading">
            {language === "th" ? "เลือกผู้ป่วย" : "Choose a patient"}
          </h2>
          <p>
            {language === "th"
              ? "ภาพถ่ายและผลจากโมเดลจะถูกเก็บไว้กับระเบียนผู้ป่วยที่เลือก"
              : "The captured image and model result will stay linked to the selected patient record."}
          </p>
        </div>
        <span className="camera-v2-record-count">
          <Users aria-hidden="true" />
          {language === "th"
            ? `${patients.length} รายการ`
            : `${patients.length} records`}
        </span>
      </header>

      <div className="camera-v2-selector-grid">
        <div className="camera-v2-filter-rail">
          <label className="camera-v2-search">
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={event => onSearch(event.target.value)}
              placeholder={
                language === "th"
                  ? "ค้นหาชื่อ รหัสผู้ป่วย หรือพื้นที่..."
                  : "Search name, patient code, or location..."
              }
              aria-label={
                language === "th" ? "ค้นหาผู้ป่วย" : "Search patients"
              }
            />
          </label>
          <div
            className="camera-v2-filter-row"
            role="tablist"
            aria-label={
              language === "th"
                ? "ตัวกรองบริบทเบาหวาน"
                : "Diabetes context filter"
            }
          >
            {labels.map(item => (
              <button
                type="button"
                role="tab"
                aria-selected={context === item.value}
                key={item.value}
                className={context === item.value ? "is-active" : ""}
                onClick={() => onContext(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="camera-v2-selection-note">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>
                {language === "th"
                  ? "เชื่อมข้อมูลอย่างปลอดภัย"
                  : "Keep the evidence connected"}
              </strong>
              <span>
                {language === "th"
                  ? "ยืนยันผู้ป่วยก่อนเปิดกล้อง"
                  : "Confirm the patient before opening the camera."}
              </span>
            </div>
          </div>
        </div>

        <div className="camera-v2-patient-results">
          <div className="camera-v2-results-heading">
            <div>
              <span className="camera-v2-kicker">Matching patients</span>
              <strong>
                {language === "th"
                  ? "เลือกผู้ป่วยเพื่อบันทึกภาพ"
                  : "Select a record to begin"}
              </strong>
            </div>
            <small>
              {language === "th"
                ? `พบ ${patients.length} รายการ`
                : `${patients.length} records found`}
            </small>
          </div>
          {selectedPatient && (
            <div className="camera-v2-selection-preview">
              <span className="camera-v2-selection-icon">
                <CheckCircle2 aria-hidden="true" />
              </span>
              <div>
                <span>Selected for capture</span>
                <strong>
                  {selectedPatient.displayName || selectedPatient.patientCode}
                </strong>
                <small>
                  {selectedPatient.patientCode} ·{" "}
                  {selectedPatient.registrationLocation}
                </small>
              </div>
              <span className="camera-v2-chip camera-v2-chip-blue">Ready</span>
            </div>
          )}
          {loading && (
            <div className="camera-v2-patient-loading">
              <span />
              <span />
              <span />
            </div>
          )}
          {!loading && Boolean(error) && (
            <div className="camera-v2-picker-empty is-error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <strong>
                {language === "th"
                  ? "โหลดรายชื่อผู้ป่วยไม่สำเร็จ"
                  : "Patients could not be loaded"}
              </strong>
              <p>{errorMessage}</p>
            </div>
          )}
          {!loading && !error && !patients.length && (
            <div className="camera-v2-picker-empty">
              <Search aria-hidden="true" />
              <strong>
                {language === "th" ? "ไม่พบผู้ป่วย" : "No patients found"}
              </strong>
              <p>
                {language === "th"
                  ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
                  : "Try a different search term or context filter."}
              </p>
            </div>
          )}
          {!loading && !error && patients.length > 0 && (
            <div className="camera-v2-patient-list">
              {patients.map(patient => (
                <PatientChoice
                  key={patient.id}
                  patient={patient}
                  selected={selectedId === String(patient.id)}
                  language={language}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="camera-v2-selector-footer">
        <span>
          <HeartPulse aria-hidden="true" />{" "}
          {language === "th"
            ? "ผู้เชี่ยวชาญต้องตรวจสอบผลลัพธ์ของโมเดล"
            : "A qualified clinician verifies model suggestions."}
        </span>
        <button
          type="button"
          className="camera-v2-primary-button"
          disabled={!selectedId || loading || Boolean(error)}
          onClick={onConfirm}
        >
          <CheckCircle2 aria-hidden="true" />
          {language === "th"
            ? "ยืนยันผู้ป่วยและไปต่อ"
            : "Confirm patient and continue"}
        </button>
      </footer>
    </section>
  );
}

function PatientChoice({
  patient,
  selected,
  language,
  onSelect,
}: {
  patient: Patient;
  selected: boolean;
  language: "th" | "en";
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`camera-v2-patient-choice ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(String(patient.id))}
    >
      <span className="camera-v2-patient-avatar">
        <UserRound aria-hidden="true" />
      </span>
      <span className="camera-v2-patient-main">
        <strong>{patient.displayName || patient.patientCode}</strong>
        <small>
          {patient.patientCode} ·{" "}
          {patient.age === null
            ? language === "th"
              ? "อายุไม่ระบุ"
              : "Age not recorded"
            : `${patient.age} ${language === "th" ? "ปี" : "years"}`}{" "}
          · {diabetesContext(patient, language)}
        </small>
        <em>
          {patient.registrationLocation} · {patient.observationCount}{" "}
          {language === "th" ? "การสังเกต" : "observations"}
        </em>
      </span>
      <span className="camera-v2-patient-check">
        {selected ? <CheckCircle2 aria-hidden="true" /> : <span />}
      </span>
    </button>
  );
}

function CaptureWorkspace({
  language,
  t,
  selectedPatient,
  selectedPatientRecord,
  selectedPatientRecordLoading,
  state,
  cameraState,
  cameraError,
  previewUrl,
  fileName,
  inferenceResult,
  imageLayout,
  helpOpen,
  capturedAt,
  woundAssessmentId,
  inputRef,
  previewImageRef,
  videoRef,
  canvasRef,
  viewportRef,
  onPreviewImageLoad,
  onHelp,
  onCloseHelp,
  onStartCamera,
  onCapture,
  onStopCamera,
  onFile,
  onReset,
  onReview,
  onChangePatient,
  onCapturedAt,
  onWoundAssessment,
  onSave,
  saving,
  showDetectorBoxes,
  showWoundMasks,
  maskOpacity,
  onShowDetectorBoxesChange,
  onShowWoundMasksChange,
  onMaskOpacityChange,
}: {
  language: "th" | "en";
  t: (key: string) => string;
  selectedPatient?: Patient;
  selectedPatientRecord?: {
    patientCode: string;
    displayName: string | null;
    registrationLocation: string;
    woundAssessments?: Array<{
      id: number;
      woundLabel: string;
      location: string;
      assessedOn: string;
    }>;
  };
  selectedPatientRecordLoading: boolean;
  state: CaptureState;
  cameraState: CameraState;
  cameraError: string;
  previewUrl: string | null;
  fileName: string;
  inferenceResult: InferenceResult | null;
  imageLayout: ImageLayout | null;
  helpOpen: boolean;
  capturedAt: string;
  woundAssessmentId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  previewImageRef: RefObject<HTMLImageElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPreviewImageLoad: () => void;
  onHelp: () => void;
  onCloseHelp: () => void;
  onStartCamera: () => void;
  onCapture: () => void;
  onStopCamera: () => void;
  onFile: (file?: File) => void;
  onReset: () => void;
  onReview: () => void;
  onChangePatient: () => void;
  onCapturedAt: (value: string) => void;
  onWoundAssessment: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  showDetectorBoxes: boolean;
  showWoundMasks: boolean;
  maskOpacity: number;
  onShowDetectorBoxesChange: (value: boolean) => void;
  onShowWoundMasksChange: (value: boolean) => void;
  onMaskOpacityChange: (value: number) => void;
}) {
  const reviewState =
    state === "ready"
      ? "ready"
      : state === "analyzing"
        ? "analyzing"
        : previewUrl
          ? "captured"
          : "waiting";

  return (
    <>
      <section
        className="camera-v2-selected-patient"
        aria-label={language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient"}
      >
        <div className="camera-v2-selected-avatar">
          <UserRound aria-hidden="true" />
        </div>
        <div className="camera-v2-selected-copy">
          <span className="camera-v2-kicker">Selected patient</span>
          <strong>
            {selectedPatientRecord?.displayName ||
              selectedPatient?.displayName ||
              selectedPatientRecord?.patientCode ||
              selectedPatient?.patientCode}
          </strong>
          <small>
            {selectedPatientRecord?.patientCode || selectedPatient?.patientCode}{" "}
            ·{" "}
            {selectedPatientRecord?.registrationLocation ||
              selectedPatient?.registrationLocation}
          </small>
        </div>
        <span className="camera-v2-chip camera-v2-chip-stable">
          <span /> Ready for capture
        </span>
        <button
          type="button"
          className="camera-v2-change-patient"
          onClick={onChangePatient}
        >
          {language === "th" ? "เปลี่ยนผู้ป่วย" : "Change patient"}
        </button>
      </section>

      <div className="camera-v2-workspace">
        <section
          className="camera-v2-panel camera-v2-capture-panel"
          aria-labelledby="camera-v2-capture-heading"
        >
          <header className="camera-v2-panel-header camera-v2-capture-header">
            <div>
              <span className="camera-v2-kicker">02 / Capture evidence</span>
              <h2 id="camera-v2-capture-heading">
                {language === "th" ? "ถ่ายภาพแผล" : "Capture wound image"}
              </h2>
              <p>
                {language === "th"
                  ? "จัดตำแหน่งแผลให้อยู่ในกรอบ แล้วเลือกภาพที่ชัดที่สุด"
                  : "Position the wound inside the guide, then choose the clearest evidence."}
              </p>
            </div>
            <div className="camera-v2-help-wrap">
              <button
                type="button"
                className="camera-v2-help"
                aria-label={t("cameraHelp")}
                aria-expanded={helpOpen}
                onClick={onHelp}
              >
                <CircleHelp aria-hidden="true" />
              </button>
              {helpOpen && (
                <div
                  className="camera-v2-help-popup"
                  role="dialog"
                  aria-label={t("cameraHelpTitle")}
                >
                  <div>
                    <strong>{t("cameraHelpTitle")}</strong>
                    <p>{t("cameraHelpText")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseHelp}
                    aria-label={t("closeHelp")}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </header>

          <div
            ref={viewportRef}
            className={`camera-v2-viewport ${previewUrl ? "has-preview" : ""} ${cameraState === "live" ? "is-live" : ""}`}
          >
            {previewUrl ? (
              <>
                <img
                  ref={previewImageRef}
                  src={previewUrl}
                  alt={t("uploadedWoundImage")}
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
                <div className="camera-v2-preview-overlay">
                  <span>
                    <FileImage aria-hidden="true" /> {fileName}
                  </span>
                  <button
                    type="button"
                    onClick={onReset}
                    aria-label={t("removeImage")}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : cameraState === "live" || cameraState === "starting" ? (
              <>
                <video
                  ref={videoRef}
                  className="camera-v2-live-video"
                  autoPlay
                  muted
                  playsInline
                  aria-label={t("cameraLivePreview")}
                />
                <div className="camera-v2-frame">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="camera-v2-live-label">
                  <Video aria-hidden="true" />{" "}
                  {cameraState === "starting"
                    ? t("cameraStarting")
                    : t("cameraLive")}
                </div>
              </>
            ) : (
              <>
                <div className="camera-v2-frame">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="camera-v2-empty">
                  <div className="camera-v2-lens">
                    <Camera aria-hidden="true" />
                  </div>
                  <strong>
                    {cameraState === "error"
                      ? t("cameraPermission")
                      : t("positionWound")}
                  </strong>
                  <p>
                    {cameraState === "error"
                      ? cameraError
                      : t("positionWoundDetail")}
                  </p>
                </div>
                <div
                  className={`camera-v2-status ${cameraState === "error" ? "is-error" : ""}`}
                >
                  <span />{" "}
                  {cameraState === "error"
                    ? t("cameraPermission")
                    : t("cameraReady")}
                </div>
              </>
            )}
          </div>

          {inferenceResult && (
            <OverlayControls
              language={language}
              showDetectorBoxes={showDetectorBoxes}
              showWoundMasks={showWoundMasks}
              maskOpacity={maskOpacity}
              hasMasks={inferenceResult.regions.some(
                region => region.segmentation.status === "ok"
              )}
              onShowDetectorBoxesChange={onShowDetectorBoxesChange}
              onShowWoundMasksChange={onShowWoundMasksChange}
              onMaskOpacityChange={onMaskOpacityChange}
            />
          )}
          {cameraError && cameraState !== "error" && (
            <div className="camera-v2-error" role="alert">
              <Info aria-hidden="true" />
              <span>{cameraError}</span>
            </div>
          )}
          <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
          <div className="camera-v2-actions">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={event => onFile(event.target.files?.[0])}
            />
            {previewUrl ? (
              <>
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="camera-v2-secondary-button"
                >
                  <RefreshCcw aria-hidden="true" /> {t("retake")}
                </Button>
                <Button
                  onClick={onReview}
                  disabled={state === "analyzing"}
                  className="camera-v2-primary-button"
                >
                  {state === "analyzing" ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />{" "}
                      {t("preparing")}
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden="true" /> {t("reviewImage")}
                    </>
                  )}
                </Button>
              </>
            ) : cameraState === "live" ? (
              <>
                <Button
                  onClick={onCapture}
                  className="camera-v2-primary-button"
                >
                  <Camera aria-hidden="true" /> {t("capturePhoto")}
                </Button>
                <Button
                  onClick={onStopCamera}
                  variant="outline"
                  className="camera-v2-secondary-button"
                >
                  <X aria-hidden="true" /> {t("stopCamera")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onStartCamera}
                  disabled={cameraState === "starting"}
                  className="camera-v2-primary-button"
                >
                  {cameraState === "starting" ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />{" "}
                      {t("cameraStarting")}
                    </>
                  ) : (
                    <>
                      <Camera aria-hidden="true" /> {t("openCamera")}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => inputRef.current?.click()}
                  variant="outline"
                  className="camera-v2-secondary-button"
                  aria-label={t("uploadImage")}
                >
                  <Upload aria-hidden="true" /> {t("uploadImage")}
                </Button>
              </>
            )}
          </div>
          <p className="camera-v2-privacy">
            <ShieldCheck aria-hidden="true" /> {t("imagePrivacy")}
          </p>
        </section>

        <section
          className="camera-v2-panel camera-v2-review-panel"
          aria-labelledby="camera-v2-review-heading"
        >
          <header className="camera-v2-panel-header camera-v2-review-header">
            <div>
              <span className="camera-v2-kicker">03 / Review & save</span>
              <h2 id="camera-v2-review-heading">
                {language === "th"
                  ? "ตรวจสอบก่อนวิเคราะห์"
                  : "Review before analysis"}
              </h2>
              <p>
                {language === "th"
                  ? "ผลลัพธ์เป็นข้อเสนอแนะ บุคลากรต้องตรวจสอบก่อนบันทึก"
                  : "Model output is a suggestion. A clinician verifies it before saving."}
              </p>
            </div>
            <span
              className={`camera-v2-state-pill camera-v2-state-${reviewState}`}
            >
              {reviewState === "ready"
                ? t("ready")
                : reviewState === "analyzing"
                  ? t("preparingReview")
                  : reviewState === "captured"
                    ? t("imageReady")
                    : t("waiting")}
            </span>
          </header>
          <div
            className={`camera-v2-review-placeholder camera-v2-review-${reviewState}`}
            aria-live="polite"
          >
            {state === "idle" ? (
              <>
                <ImagePlus aria-hidden="true" />
                <strong>{t("noImageYet")}</strong>
                <p>{t("noImageYetDetail")}</p>
              </>
            ) : state === "analyzing" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                <strong>{t("preparingReview")}</strong>
                <p>{t("preparingReviewDetail")}</p>
              </>
            ) : (
              <>
                <Check aria-hidden="true" />
                <strong>{t("imageReady")}</strong>
                <p>{t("imageReadyDetail")}</p>
              </>
            )}
          </div>
          {inferenceResult && (
            <div
              className="camera-v2-inference"
              role="status"
              aria-live="polite"
            >
              <div>
                <span>{t("modelSuggestion")}</span>
                <small>
                  {inferenceResult.detections.length} {t("detectionsFound")}
                </small>
              </div>
              {inferenceResult.topSuggestion ? (
                <>
                  <strong>
                    {inferenceResult.topSuggestion.label.replaceAll("_", " ")}
                  </strong>
                  <p>
                    {t("confidence")}:{" "}
                    {Math.round(inferenceResult.topSuggestion.confidence * 100)}
                    %
                  </p>
                  <em>{inferenceResult.disclaimer}</em>
                </>
              ) : (
                <>
                  <strong>{t("noDetections")}</strong>
                  <em>{inferenceResult.disclaimer}</em>
                </>
              )}
            </div>
          )}
          {inferenceResult && inferenceResult.detections.length === 0 && (
            <InconclusiveInferenceState
              language={language}
              disclaimer={inferenceResult.disclaimer}
            />
          )}
          {inferenceResult?.regions.length ? (
            <RegionAnalysisList
              regions={inferenceResult.regions}
              language={language}
            />
          ) : null}
          {previewUrl && (
            <PhotoAssignment
              language={language}
              t={t}
              patient={selectedPatientRecord}
              loading={selectedPatientRecordLoading}
              woundAssessmentId={woundAssessmentId}
              capturedAt={capturedAt}
              onWoundAssessment={onWoundAssessment}
              onCapturedAt={onCapturedAt}
              onSave={onSave}
              saving={saving}
            />
          )}
        </section>
      </div>
    </>
  );
}

function PhotoAssignment({
  language,
  t,
  patient,
  loading,
  woundAssessmentId,
  capturedAt,
  onWoundAssessment,
  onCapturedAt,
  onSave,
  saving,
}: {
  language: "th" | "en";
  t: (key: string) => string;
  patient?: {
    patientCode: string;
    displayName: string | null;
    registrationLocation: string;
    woundAssessments?: Array<{
      id: number;
      woundLabel: string;
      location: string;
      assessedOn: string;
    }>;
  };
  loading: boolean;
  woundAssessmentId: string;
  capturedAt: string;
  onWoundAssessment: (value: string) => void;
  onCapturedAt: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const assessments = patient?.woundAssessments ?? [];
  return (
    <div className="camera-v2-assignment">
      <div className="camera-v2-assignment-title">
        <Database aria-hidden="true" />
        <div>
          <span className="camera-v2-kicker">Clinical record</span>
          <strong>
            {language === "th"
              ? "บันทึกเข้าระเบียนผู้ป่วย"
              : "Save to patient record"}
          </strong>
        </div>
      </div>
      <p>
        {patient?.patientCode} ·{" "}
        {patient?.displayName ||
          (language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient")}
      </p>
      <label>
        <span>{t("woundAssessment")}</span>
        <select
          value={woundAssessmentId}
          onChange={event => onWoundAssessment(event.target.value)}
          disabled={saving || loading}
        >
          <option value="">
            {loading ? t("loadingAssessments") : t("noSpecificAssessment")}
          </option>
          {assessments.map(assessment => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.woundLabel} · {assessment.location} ·{" "}
              {assessment.assessedOn}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("photoDateTime")}</span>
        <input
          type="datetime-local"
          value={capturedAt}
          onChange={event => onCapturedAt(event.target.value)}
          disabled={saving}
        />
      </label>
      <Button
        onClick={onSave}
        disabled={saving || !capturedAt}
        className="camera-v2-primary-button"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />{" "}
            {t("savingPhoto")}
          </>
        ) : (
          <>
            <Upload aria-hidden="true" /> {t("savePhotoToPatient")}
          </>
        )}
      </Button>
      <small>{t("photoAssignmentNote")}</small>
    </div>
  );
}

function diabetesContext(
  patient: { type1: number; type2: number; gdm: number },
  language: "th" | "en"
) {
  if (patient.type1) return "Type 1";
  if (patient.type2) return "Type 2";
  if (patient.gdm) return "GDM";
  return language === "th" ? "ไม่ได้บันทึก" : "Not recorded";
}
