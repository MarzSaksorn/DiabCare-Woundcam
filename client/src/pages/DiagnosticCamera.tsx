import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Button as HeroButton,
  Card as HeroCard,
  Input as HeroInput,
} from "@heroui/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
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
import "@heroui/react/styles";

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
      <div className="camera-console">
        <header className="camera-console-header">
          <div className="camera-console-title-block">
            <Link href="/" className="camera-console-back">
              <ChevronLeft aria-hidden="true" /> {t("overview")}
            </Link>
            <div className="camera-console-overline">
              <span>
                {language === "th" ? "บันทึกภาพแผล RGB" : "RGB WOUND CAPTURE"}
              </span>
              <span className="camera-console-secure-chip">
                <ShieldCheck aria-hidden="true" />
                {language === "th" ? "ขอบเขตปลอดภัย" : "Protected boundary"}
              </span>
            </div>
            <h1>
              {language === "th" ? "ศูนย์บันทึกภาพแผล" : "Wound image capture"}
            </h1>
            <p>
              {language === "th"
                ? "เลือกผู้ป่วย ถ่ายภาพแผลที่ชัดเจน แล้วตรวจสอบผลก่อนบันทึก"
                : "Select the patient, take a clear wound image, and review the result before saving."}
            </p>
          </div>
          <div className="camera-console-brand">
            <img src="/assets/diabcare-logo.jpg" alt="" />
            <div>
              <strong>DiabCare Cam</strong>
              <small>
                {language === "th" ? "การบันทึกทางคลินิก" : "Clinical capture"}
              </small>
            </div>
          </div>
        </header>

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
        <div className="camera-console-history">
          <DiagnosticPhotoHistory />
        </div>
      </div>
    </DashboardLayout>
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
  return (
    <HeroCard
      variant="default"
      className="camera-console-card camera-console-case-gate"
      aria-labelledby="camera-case-gate-heading"
    >
      <HeroCard.Header className="camera-console-card-header">
        <div>
          <span className="camera-console-phase">CASE GATE / 01</span>
          <h2 id="camera-case-gate-heading">
            {language === "th"
              ? "เลือกผู้ป่วยก่อนเปิดกล้อง"
              : "Choose the record before opening the camera"}
          </h2>
          <p>
            {language === "th"
              ? "ภาพถ่ายและผลจากโมเดลจะคงอยู่กับระเบียนผู้ป่วยที่ยืนยัน"
              : "The image and model output stay linked to the patient record you confirm."}
          </p>
        </div>
        <span className="camera-console-record-count">
          <Users aria-hidden="true" />{" "}
          {language === "th"
            ? `${patients.length} รายการ`
            : `${patients.length} records`}
        </span>
      </HeroCard.Header>

      <HeroCard.Content className="camera-console-case-content">
        <div className="camera-console-case-tools">
          <div className="camera-console-search-wrap">
            <Search aria-hidden="true" />
            <HeroInput
              aria-label={
                language === "th" ? "ค้นหาผู้ป่วย" : "Search patients"
              }
              className="camera-console-search-input"
              variant="secondary"
              fullWidth
              value={search}
              onChange={event => onSearch(event.target.value)}
              placeholder={
                language === "th"
                  ? "ค้นหาชื่อ รหัสผู้ป่วย หรือพื้นที่..."
                  : "Search name, patient code, or location..."
              }
            />
          </div>
          <div
            className="camera-console-filter-row"
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
          <div className="camera-console-case-note">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>
                {language === "th"
                  ? "เชื่อมข้อมูลอย่างปลอดภัย"
                  : "Keep evidence connected"}
              </strong>
              <span>
                {language === "th"
                  ? "ยืนยันผู้ป่วยก่อนเริ่มบันทึกภาพ"
                  : "Confirm the patient before starting capture."}
              </span>
            </div>
          </div>
        </div>

        <div className="camera-console-case-results">
          <div className="camera-console-results-heading">
            <div>
              <span className="camera-console-phase">MATCHING PATIENTS</span>
              <strong>
                {language === "th"
                  ? "เลือกผู้ป่วยเพื่อเริ่มต้น"
                  : "Select a record to begin"}
              </strong>
            </div>
            <small>
              {language === "th"
                ? `พบ ${patients.length} รายการ`
                : `${patients.length} records found`}
            </small>
          </div>
          {loading && (
            <div className="camera-console-patient-loading">
              <span />
              <span />
              <span />
            </div>
          )}
          {!loading && Boolean(error) && (
            <div className="camera-console-empty is-error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <strong>
                {language === "th"
                  ? "โหลดรายชื่อผู้ป่วยไม่สำเร็จ"
                  : "Patients could not be loaded"}
              </strong>
              <p>{errorMessage}</p>
              <small>
                {language === "th"
                  ? "ลองรีเฟรชหรือติดต่อผู้ดูแลระบบท้องถิ่น"
                  : "Try refreshing or contact the local administrator."}
              </small>
            </div>
          )}
          {!loading && !error && !patients.length && (
            <div className="camera-console-empty">
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
            <div className="camera-console-patient-list">
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
      </HeroCard.Content>

      <HeroCard.Footer className="camera-console-case-footer">
        <span>
          <HeartPulse aria-hidden="true" />{" "}
          {language === "th"
            ? "ผู้เชี่ยวชาญต้องตรวจสอบผลลัพธ์ของโมเดล"
            : "A qualified clinician verifies model suggestions."}
        </span>
        <HeroButton
          variant="primary"
          size="lg"
          className="camera-console-primary-action"
          onPress={onConfirm}
          isDisabled={!selectedId || loading || Boolean(error)}
        >
          <CheckCircle2 aria-hidden="true" />{" "}
          {language === "th"
            ? "ยืนยันผู้ป่วยและไปต่อ"
            : "Confirm patient and continue"}
          <ArrowRight aria-hidden="true" />
        </HeroButton>
      </HeroCard.Footer>
    </HeroCard>
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
      className={`camera-console-patient-choice ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(String(patient.id))}
    >
      <span className="camera-console-patient-avatar">
        <UserRound aria-hidden="true" />
      </span>
      <span className="camera-console-patient-main">
        <span className="camera-console-patient-line">
          <strong>{patient.displayName || patient.patientCode}</strong>
          {patient.displayName && (
            <small className="camera-console-patient-code">
              {patient.patientCode}
            </small>
          )}
        </span>
        <small>
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
      <span className="camera-console-patient-check">
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
        className="camera-console-case-banner"
        aria-label={language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient"}
      >
        <div className="camera-console-case-avatar">
          <UserRound aria-hidden="true" />
        </div>
        <div className="camera-console-case-copy">
          <span className="camera-console-phase">ACTIVE CASE</span>
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
        <span className="camera-console-live-tag">
          <span /> Ready for capture
        </span>
        <button
          type="button"
          className="camera-console-change-case"
          onClick={onChangePatient}
        >
          {language === "th" ? "เปลี่ยนผู้ป่วย" : "Change patient"}
        </button>
      </section>

      <div className="camera-console-workspace">
        <HeroCard
          variant="tertiary"
          className="camera-console-card camera-console-evidence-card"
          aria-labelledby="camera-console-capture-heading"
        >
          <HeroCard.Header className="camera-console-card-header camera-console-evidence-header">
            <div>
              <span className="camera-console-phase">CAPTURE / 02</span>
              <h2 id="camera-console-capture-heading">
                {language === "th" ? "ถ่ายภาพแผล" : "Capture wound evidence"}
              </h2>
              <p>
                {language === "th"
                  ? "จัดตำแหน่งแผลให้อยู่ในกรอบ แล้วเลือกภาพที่ชัดที่สุด"
                  : "Place the wound inside the guide and choose the clearest evidence."}
              </p>
            </div>
            <div className="camera-console-help-wrap">
              <button
                type="button"
                className="camera-console-help"
                aria-label={t("cameraHelp")}
                aria-expanded={helpOpen}
                onClick={onHelp}
              >
                <CircleHelp aria-hidden="true" />
              </button>
              {helpOpen && (
                <div
                  className="camera-console-help-popup"
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
          </HeroCard.Header>
          <HeroCard.Content className="camera-console-evidence-content">
            <div
              ref={viewportRef}
              className={`camera-console-viewport ${previewUrl ? "has-preview" : ""} ${cameraState === "live" ? "is-live" : ""}`}
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
                  <div className="camera-console-preview-overlay">
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
                    className="camera-console-live-video"
                    autoPlay
                    muted
                    playsInline
                    aria-label={t("cameraLivePreview")}
                  />
                  <div className="camera-console-frame">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="camera-console-live-label">
                    <Video aria-hidden="true" />{" "}
                    {cameraState === "starting"
                      ? t("cameraStarting")
                      : t("cameraLive")}
                  </div>
                </>
              ) : (
                <>
                  <div className="camera-console-frame">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="camera-console-empty-camera">
                    <div className="camera-console-lens">
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
                    className={`camera-console-camera-status ${cameraState === "error" ? "is-error" : ""}`}
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
              <div className="camera-console-error" role="alert">
                <Info aria-hidden="true" />
                <span>{cameraError}</span>
              </div>
            )}
            <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
            <div className="camera-console-actions">
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
                    className="camera-console-secondary-action"
                  >
                    <RefreshCcw aria-hidden="true" /> {t("retake")}
                  </Button>
                  <Button
                    onClick={onReview}
                    disabled={state === "analyzing"}
                    className="camera-console-primary-action"
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
                  <HeroButton
                    variant="primary"
                    size="lg"
                    className="camera-console-primary-action"
                    onPress={onCapture}
                  >
                    <Camera aria-hidden="true" /> {t("capturePhoto")}
                  </HeroButton>
                  <Button
                    onClick={onStopCamera}
                    variant="outline"
                    className="camera-console-secondary-action"
                  >
                    <X aria-hidden="true" /> {t("stopCamera")}
                  </Button>
                </>
              ) : (
                <>
                  <HeroButton
                    variant="primary"
                    size="lg"
                    className="camera-console-primary-action"
                    onPress={onStartCamera}
                    isDisabled={cameraState === "starting"}
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
                  </HeroButton>
                  <Button
                    onClick={() => inputRef.current?.click()}
                    variant="outline"
                    className="camera-console-secondary-action"
                    aria-label={t("uploadImage")}
                  >
                    <Upload aria-hidden="true" /> {t("uploadImage")}
                  </Button>
                </>
              )}
            </div>
            <p className="camera-console-privacy">
              <ShieldCheck aria-hidden="true" /> {t("imagePrivacy")}
            </p>
          </HeroCard.Content>
        </HeroCard>

        <aside
          className="camera-console-review-rail"
          aria-labelledby="camera-console-review-heading"
        >
          <HeroCard
            variant="default"
            className="camera-console-card camera-console-review-card"
          >
            <HeroCard.Header className="camera-console-card-header camera-console-review-header">
              <div>
                <span className="camera-console-phase">REVIEW / 03</span>
                <h2 id="camera-console-review-heading">
                  {language === "th"
                    ? "ตรวจสอบก่อนบันทึก"
                    : "Review before save"}
                </h2>
                <p>
                  {language === "th"
                    ? "ผลลัพธ์ช่วยตัดสินใจเท่านั้น บุคลากรต้องยืนยัน"
                    : "Decision support only. A qualified clinician verifies the result."}
                </p>
              </div>
              <span
                className={`camera-console-review-state camera-console-review-${reviewState}`}
              >
                {reviewState === "ready"
                  ? t("ready")
                  : reviewState === "analyzing"
                    ? t("preparingReview")
                    : reviewState === "captured"
                      ? t("imageReady")
                      : t("waiting")}
              </span>
            </HeroCard.Header>
            <HeroCard.Content className="camera-console-review-content">
              <div
                className={`camera-console-review-empty camera-console-review-empty-${reviewState}`}
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
                  className="camera-console-inference"
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
                        {inferenceResult.topSuggestion.label.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>
                      <p>
                        {t("confidence")}:{" "}
                        {Math.round(
                          inferenceResult.topSuggestion.confidence * 100
                        )}
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
            </HeroCard.Content>
          </HeroCard>
        </aside>
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
    <div className="camera-console-assignment">
      <div className="camera-console-assignment-title">
        <Database aria-hidden="true" />
        <div>
          <span className="camera-console-phase">RECORD LINK</span>
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
        className="camera-console-primary-action"
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
