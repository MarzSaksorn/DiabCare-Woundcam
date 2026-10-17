import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Button as HeroButton, Card as HeroCard } from "@heroui/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Database,
  Info,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import DiagnosticPhotoHistory from "@/components/DiagnosticPhotoHistory";
import CameraPreviewFrame, {
  type CameraPreviewMode,
} from "@/components/CameraPreviewFrame";
import {
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
    { query: patientSearch, context: patientContext, offset: 0, limit: 100 },
    { retry: false }
  );
  const allPatientsCountQuery = trpc.diabetes.registeredPatientsPage.useQuery(
    { query: "", context: "all", offset: 0, limit: 1 },
    { retry: false, staleTime: 30_000 }
  );
  const type1PatientsCountQuery = trpc.diabetes.registeredPatientsPage.useQuery(
    { query: "", context: "type1", offset: 0, limit: 1 },
    { retry: false, staleTime: 30_000 }
  );
  const type2PatientsCountQuery = trpc.diabetes.registeredPatientsPage.useQuery(
    { query: "", context: "type2", offset: 0, limit: 1 },
    { retry: false, staleTime: 30_000 }
  );
  const gdmPatientsCountQuery = trpc.diabetes.registeredPatientsPage.useQuery(
    { query: "", context: "gdm", offset: 0, limit: 1 },
    { retry: false, staleTime: 30_000 }
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
  const selectedName = selectedPatient
    ? selectedPatient.displayName || selectedPatient.patientCode
    : null;
  const selectedType = selectedPatient
    ? diabetesContext(selectedPatient, language)
    : null;
  const selectedAge = selectedPatient
    ? selectedPatient.age === null
      ? language === "th"
        ? "ไม่ระบุอายุ"
        : "age not recorded"
      : `${selectedPatient.age} ${language === "th" ? "ปี" : "years"}`
    : null;
  const patientSelectionDock = !workflowStarted ? (
    <PatientSelectionFooter
      variant="dock"
      language={language}
      selectedId={selectedPatientId}
      selectedName={selectedName}
      selectedType={selectedType}
      selectedAge={selectedAge}
      loading={patientsQuery.isLoading}
      hasError={Boolean(patientsQuery.error)}
      onClear={() => setSelectedPatientId("")}
      onConfirm={confirmPatient}
    />
  ) : undefined;
  const cameraStatusLabel =
    cameraState === "live"
      ? t("cameraLive")
      : cameraState === "starting"
        ? t("cameraStarting")
        : cameraState === "error"
          ? t("cameraPermission")
          : t("cameraReady");

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
    setInferenceResult(null);
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
    if (!inferenceResult || state !== "ready") {
      toast.error(
        language === "th"
          ? "โปรดตรวจสอบภาพก่อนบันทึก"
          : "Review the image before saving"
      );
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
    <DashboardLayout bottomDock={patientSelectionDock}>
      <div className="camera-console">
        {!workflowStarted ? (
          <PatientSelector
            language={language}
            t={t}
            patients={patients}
            selectedPatient={selectedPatient}
            total={patientsQuery.data?.total ?? patients.length}
            counts={{
              all: allPatientsCountQuery.data?.total,
              type1: type1PatientsCountQuery.data?.total,
              type2: type2PatientsCountQuery.data?.total,
              gdm: gdmPatientsCountQuery.data?.total,
            }}
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
            onClear={() => setSelectedPatientId("")}
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
            selectedPatientRecordError={selectedPatientRecordQuery.error}
            state={state}
            cameraState={cameraState}
            cameraStatusLabel={cameraStatusLabel}
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
        <div className="camera-console-history" id="capture-history">
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
  selectedPatient,
  total,
  counts,
  loading,
  error,
  search,
  context,
  selectedId,
  onSearch,
  onContext,
  onSelect,
  onClear,
  onConfirm,
}: {
  language: "th" | "en";
  t: (key: string) => string;
  patients: Patient[];
  selectedPatient?: Patient;
  total: number;
  counts: Record<PatientContext, number | undefined>;
  loading: boolean;
  error: unknown;
  search: string;
  context: PatientContext;
  selectedId: string;
  onSearch: (value: string) => void;
  onContext: (value: PatientContext) => void;
  onSelect: (value: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const filters: Array<{ value: PatientContext; label: string }> = [
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
  const selectedName = selectedPatient
    ? selectedPatient.displayName || selectedPatient.patientCode
    : null;
  const selectedType = selectedPatient
    ? diabetesContext(selectedPatient, language)
    : null;
  const selectedAge = selectedPatient
    ? selectedPatient.age === null
      ? language === "th"
        ? "ไม่ระบุอายุ"
        : "age not recorded"
      : `${selectedPatient.age} ${language === "th" ? "ปี" : "years"}`
    : null;
  const isCompact = collapsed && Boolean(selectedPatient);

  useEffect(() => {
    if (!selectedPatient) setCollapsed(false);
  }, [selectedPatient]);

  if (isCompact && selectedPatient) {
    return (
      <CollapsedPatientBanner
        language={language}
        patient={selectedPatient}
        selectedName={selectedName}
        selectedType={selectedType}
        selectedAge={selectedAge}
        total={total}
        context={context}
        onChangePatient={() => setCollapsed(false)}
        onExpand={() => setCollapsed(false)}
      />
    );
  }

  return (
    <section
      className="camera-console-stitch-selector"
      aria-labelledby="camera-case-gate-heading"
    >
      <header className="camera-console-stitch-selector-header">
        <div className="camera-console-stitch-selector-heading">
          <div className="camera-console-stitch-selector-title-row">
            <span className="camera-console-stitch-selector-icon">
              <UserRound aria-hidden="true" />
            </span>
            <span className="camera-console-stitch-selector-eyebrow">
              {language === "th" ? "ระบบคัดเลือกผู้ป่วย" : "PATIENT SELECTION"}
            </span>
          </div>
          <h2 id="camera-case-gate-heading">
            {language === "th"
              ? "เลือกผู้ป่วยเบาหวาน"
              : "Choose a diabetes patient"}
          </h2>
          <p>
            {language === "th"
              ? "แตะเพื่อเลือกผู้ป่วยหนึ่งรายสำหรับบันทึกภาพถ่ายและติดตามการดูแล"
              : "Tap to choose one patient for wound photography and care follow-up."}
          </p>
        </div>
        <button
          type="button"
          className="camera-console-stitch-selector-collapse"
          onClick={() => setCollapsed(true)}
          disabled={!selectedPatient}
          aria-expanded={!isCompact}
          title={
            language === "th"
              ? "พับเก็บรายการเลือกผู้ป่วย"
              : "Collapse patient list"
          }
        >
          <span>{language === "th" ? "พับเก็บรายการ" : "Collapse list"}</span>
          <ChevronUp aria-hidden="true" />
        </button>
      </header>

      <div className="camera-console-stitch-selector-tools">
        <label className="camera-console-stitch-selector-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label={language === "th" ? "ค้นหาผู้ป่วย" : "Search patients"}
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder={
              language === "th"
                ? "ค้นหาด้วยชื่อผู้ป่วย..."
                : "Search by patient name..."
            }
          />
        </label>
        <div
          className="camera-console-stitch-selector-filters"
          role="tablist"
          aria-label={
            language === "th" ? "ตัวกรองประเภทเบาหวาน" : "Diabetes type filter"
          }
        >
          {filters.map(item => (
            <button
              type="button"
              role="tab"
              aria-selected={context === item.value}
              key={item.value}
              className={context === item.value ? "is-active" : ""}
              onClick={() => onContext(item.value)}
            >
              {item.label} <span>({counts[item.value] ?? "—"})</span>
            </button>
          ))}
        </div>
      </div>

      <main className="camera-console-stitch-selector-list-area">
        <div className="camera-console-stitch-selector-list-meta">
          <span>
            {language === "th"
              ? "แสดงผลตามเงื่อนไขที่เลือก"
              : "Showing matches for the selected filters"}
          </span>
          <span>
            {language === "th" ? `${total} รายการ` : `${total} records`}
          </span>
        </div>
        {loading && (
          <div
            className="camera-console-stitch-selector-loading"
            aria-label={t("loading")}
          >
            <span />
            <span />
            <span />
          </div>
        )}
        {!loading && Boolean(error) && (
          <div
            className="camera-console-stitch-selector-empty is-error"
            role="alert"
          >
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
          <div className="camera-console-stitch-selector-empty">
            <Search aria-hidden="true" />
            <strong>
              {language === "th"
                ? "ไม่พบรายชื่อผู้ป่วยที่ตรงกับการค้นหา"
                : "No patients match your search"}
            </strong>
            <p>
              {language === "th"
                ? "ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองประเภทอื่น"
                : "Try a different search or diabetes type."}
            </p>
            <button
              type="button"
              onClick={() => {
                onSearch("");
                onContext("all");
              }}
            >
              {language === "th" ? "ล้างตัวกรองทั้งหมด" : "Clear all filters"}
            </button>
          </div>
        )}
        {!loading && !error && patients.length > 0 && (
          <fieldset className="camera-console-stitch-selector-patient-list">
            <legend className="sr-only">
              {language === "th"
                ? "เลือกผู้ป่วยหนึ่งราย"
                : "Select one patient"}
            </legend>
            {patients.map(patient => (
              <PatientChoice
                key={patient.id}
                patient={patient}
                selected={selectedId === String(patient.id)}
                language={language}
                onSelect={onSelect}
              />
            ))}
          </fieldset>
        )}
      </main>

      <PatientSelectionFooter
        variant="inline"
        language={language}
        selectedId={selectedId}
        selectedName={selectedName}
        selectedType={selectedType}
        selectedAge={selectedAge}
        loading={loading}
        hasError={Boolean(error)}
        onClear={onClear}
        onConfirm={onConfirm}
      />
    </section>
  );
}

function CollapsedPatientBanner({
  language,
  patient,
  selectedName,
  selectedType,
  selectedAge,
  total,
  context,
  onChangePatient,
  onExpand,
}: {
  language: "th" | "en";
  patient: Patient;
  selectedName: string | null;
  selectedType: string | null;
  selectedAge: string | null;
  total: number;
  context: PatientContext;
  onChangePatient: () => void;
  onExpand: () => void;
}) {
  const filterLabel =
    context === "all"
      ? language === "th"
        ? "ทั้งหมด"
        : "All"
      : context === "type1"
        ? "Type 1"
        : context === "type2"
          ? "Type 2"
          : "GDM";

  return (
    <section
      className="camera-console-stitch-selector camera-console-stitch-selector-collapsed"
      aria-label={language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient"}
    >
      <div className="camera-console-stitch-selector-collapsed-main">
        <div className="camera-console-stitch-selector-collapsed-patient">
          <span className="camera-console-stitch-selector-collapsed-avatar">
            <UserRound aria-hidden="true" />
            <span aria-hidden="true" />
          </span>
          <div className="camera-console-stitch-selector-collapsed-copy">
            <div className="camera-console-stitch-selector-collapsed-badges">
              <span className="camera-console-stitch-selector-collapsed-eyebrow">
                {language === "th" ? "ผู้ป่วยที่เลือก" : "SELECTED PATIENT"}
              </span>
              <span
                className={`camera-console-stitch-selector-patient-badge is-${diabetesContextKey(patient)}`}
              >
                {selectedType}
              </span>
              <span className="camera-console-stitch-selector-collapsed-hn">
                <span aria-hidden="true" />
                HN: {patient.patientCode}
              </span>
            </div>
            <h2>{selectedName}</h2>
            <div className="camera-console-stitch-selector-collapsed-details">
              <span>{selectedAge}</span>
              {patient.registrationLocation && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>
                    {language === "th" ? "ลงทะเบียน: " : "Registered: "}
                    {patient.registrationLocation}
                  </span>
                </>
              )}
              <span aria-hidden="true">•</span>
              <span className="is-accent">
                {language === "th"
                  ? "ติดตามแผลเบาหวาน"
                  : "Diabetic wound follow-up"}
              </span>
            </div>
          </div>
        </div>
        <div className="camera-console-stitch-selector-collapsed-actions">
          <button type="button" onClick={onChangePatient}>
            <RefreshCcw aria-hidden="true" />
            <span>
              {language === "th" ? "เปลี่ยนผู้ป่วย" : "Change patient"}
            </span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="is-primary"
            aria-expanded={false}
          >
            <ChevronDown aria-hidden="true" />
            <span>
              {language === "th" ? "ขยายรายการ" : "Expand list"} ({total}{" "}
              {language === "th" ? "รายการ" : "records"})
            </span>
          </button>
        </div>
      </div>
      <div className="camera-console-stitch-selector-collapsed-meta">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            {language === "th"
              ? "แสดงเฉพาะข้อมูลจำเป็น"
              : "Only necessary patient data shown"}
          </span>
        </div>
        <div>
          <span>
            {language === "th" ? "ตัวกรองปัจจุบัน: " : "Current filter: "}
          </span>
          <strong>
            {filterLabel} ({total})
          </strong>
        </div>
      </div>
    </section>
  );
}

function PatientSelectionFooter({
  variant,
  language,
  selectedId,
  selectedName,
  selectedType,
  selectedAge,
  loading,
  hasError,
  onClear,
  onConfirm,
}: {
  variant: "inline" | "dock";
  language: "th" | "en";
  selectedId: string;
  selectedName: string | null;
  selectedType: string | null;
  selectedAge: string | null;
  loading: boolean;
  hasError: boolean;
  onClear: () => void;
  onConfirm: () => void;
}) {
  const dock = variant === "dock";
  return (
    <footer
      className={
        dock
          ? "bottom-nav-confirmation"
          : "camera-console-stitch-selector-footer"
      }
    >
      <div
        className={
          dock
            ? "bottom-nav-confirmation-status"
            : "camera-console-stitch-selector-selection-status"
        }
        aria-live="polite"
      >
        <span className={selectedId ? "is-selected" : ""} />
        <span>
          {selectedName ? (
            <>
              <strong>{selectedName}</strong> ({selectedType}, {selectedAge})
            </>
          ) : language === "th" ? (
            "ยังไม่ได้เลือกผู้ป่วย"
          ) : (
            "No patient selected"
          )}
        </span>
      </div>
      <div
        className={
          dock
            ? "bottom-nav-confirmation-actions"
            : "camera-console-stitch-selector-footer-actions"
        }
      >
        <button
          type="button"
          className={
            dock
              ? "bottom-nav-confirmation-clear"
              : "camera-console-stitch-selector-clear"
          }
          onClick={onClear}
          disabled={!selectedId}
        >
          {language === "th" ? "ยกเลิกการเลือก" : "Clear selection"}
        </button>
        <button
          type="button"
          className={
            dock
              ? "bottom-nav-confirmation-confirm"
              : "camera-console-stitch-selector-confirm"
          }
          onClick={onConfirm}
          disabled={!selectedId || loading || hasError}
        >
          <span>{language === "th" ? "ดำเนินการต่อ" : "Continue"}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </footer>
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
  const name = patient.displayName || patient.patientCode;
  const type = diabetesContext(patient, language);
  return (
    <label
      className={`camera-console-stitch-selector-patient-row ${selected ? "is-selected" : ""}`}
    >
      <input
        type="radio"
        name="cameraSelectedPatient"
        value={patient.id}
        checked={selected}
        onChange={() => onSelect(String(patient.id))}
        aria-label={language === "th" ? `เลือก ${name}` : `Select ${name}`}
      />
      <span className="camera-console-stitch-selector-patient-copy">
        <strong>{name}</strong>
        <small>
          {patient.age === null
            ? language === "th"
              ? "อายุไม่ระบุ"
              : "Age not recorded"
            : `${patient.age} ${language === "th" ? "ปี" : "years"}`}
        </small>
      </span>
      <span
        className={`camera-console-stitch-selector-patient-badge is-${diabetesContextKey(patient)}`}
      >
        {type}
      </span>
    </label>
  );
}

function CaptureWorkspace({
  language,
  t,
  selectedPatient,
  selectedPatientRecord,
  selectedPatientRecordLoading,
  selectedPatientRecordError,
  state,
  cameraState,
  cameraStatusLabel,
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
  selectedPatientRecordError: unknown;
  state: CaptureState;
  cameraState: CameraState;
  cameraStatusLabel: string;
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
  const patientName =
    selectedPatientRecord?.displayName ||
    selectedPatient?.displayName ||
    selectedPatientRecord?.patientCode ||
    selectedPatient?.patientCode ||
    (language === "th" ? "ผู้ป่วยที่เลือก" : "Selected patient");
  const patientCode =
    selectedPatientRecord?.patientCode || selectedPatient?.patientCode || "—";
  const patientType = selectedPatient
    ? diabetesContext(selectedPatient, language)
    : null;
  const patientAge =
    selectedPatient?.age === null || selectedPatient?.age === undefined
      ? null
      : `${selectedPatient.age} ${language === "th" ? "ปี" : "years"}`;
  const previewMode: CameraPreviewMode =
    state === "analyzing"
      ? "processing"
      : inferenceResult
        ? "processed"
        : previewUrl
          ? "captured"
          : cameraState === "starting"
            ? "starting"
            : cameraState === "live"
              ? "live"
              : cameraState === "error"
                ? "error"
                : "standby";
  const previewModeLabelByMode: Record<CameraPreviewMode, string> = {
    standby: language === "th" ? "พร้อมจัดกรอบภาพ" : "FRAME GUIDE",
    starting: language === "th" ? "กำลังเปิดกล้อง" : "STARTING CAMERA",
    live: "AI LIVE ASSIST",
    error: language === "th" ? "กล้องไม่พร้อมใช้งาน" : "CAMERA ERROR",
    captured: language === "th" ? "บันทึกภาพแล้ว" : "CAPTURED FRAME",
    processing: language === "th" ? "กำลังประมวลผล" : "PROCESSING",
    processed: language === "th" ? "ทบทวนผลโมเดล" : "MODEL REVIEW",
  };
  const previewModeLabel = previewModeLabelByMode[previewMode];

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
          <span className="camera-console-phase">
            {language === "th" ? "ผู้ป่วยปัจจุบัน" : "ACTIVE CASE"}
          </span>
          <strong>{patientName}</strong>
          <small>
            <span className="camera-console-patient-code">{patientCode}</span>
            {(selectedPatientRecord?.registrationLocation ||
              selectedPatient?.registrationLocation) && (
              <>
                {" · "}
                {selectedPatientRecord?.registrationLocation ||
                  selectedPatient?.registrationLocation}
              </>
            )}
            {patientType && <> · {patientType}</>}
            {patientAge && <> · {patientAge}</>}
          </small>
        </div>
        <span className="camera-console-live-tag">
          <span />
          {language === "th" ? "พร้อมถ่ายภาพ" : "Ready for capture"}
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
        <section
          className="camera-console-preview-column"
          aria-labelledby="camera-console-capture-heading"
        >
          <div className="camera-console-preview-section-heading">
            <div>
              <div className="camera-console-preview-title-row">
                <span className="camera-console-phase">CAPTURE / 02</span>
                <span aria-hidden="true" />
                <h2 id="camera-console-capture-heading">
                  {language === "th"
                    ? "ถ่ายภาพแผลและตรวจจับอัตโนมัติ (Live AI Detection)"
                    : "Capture and detect automatically (Live AI assist)"}
                </h2>
              </div>
              <p>
                {language === "th"
                  ? "จัดตำแหน่งแผลให้อยู่ในกรอบ และเลือกภาพที่ดีที่สุด"
                  : "Position the wound inside the guide and choose the clearest evidence."}
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
          </div>
          <HeroCard
            variant="tertiary"
            className="camera-console-card camera-console-evidence-card"
          >
            <HeroCard.Content className="camera-console-evidence-content">
              <CameraPreviewFrame
                mode={previewMode}
                modeLabel={previewModeLabel}
                statusLabel={cameraStatusLabel}
                fileName={fileName}
                fileNameFallback={t("noImageYet")}
                previewUrl={previewUrl}
                previewAlt={t("uploadedWoundImage")}
                removeImageLabel={t("removeImage")}
                emptyTitle={t("positionWound")}
                emptyDetail={t("positionWoundDetail")}
                errorTitle={t("cameraPermission")}
                errorDetail={cameraError}
                liveLabel={t("cameraLive")}
                startingLabel={t("cameraStarting")}
                livePreviewLabel={t("cameraLivePreview")}
                viewportRef={viewportRef}
                previewImageRef={previewImageRef}
                videoRef={videoRef}
                onPreviewImageLoad={onPreviewImageLoad}
                onReset={onReset}
                inferenceResult={inferenceResult}
                imageLayout={imageLayout}
                language={language}
                showDetectorBoxes={showDetectorBoxes}
                showWoundMasks={showWoundMasks}
                maskOpacity={maskOpacity}
              />
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
          <div className="camera-console-preview-clinical-note">
            <Info aria-hidden="true" />
            <span>
              <strong>
                {language === "th"
                  ? "คำชี้แจงความปลอดภัยทางคลินิก:"
                  : "Clinical safety note:"}
              </strong>{" "}
              {t("diagnosticDisclaimer")}
            </span>
          </div>
        </section>

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
            </HeroCard.Header>
            <HeroCard.Content className="camera-console-review-content">
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
                  error={selectedPatientRecordError}
                  reviewed={state === "ready" && Boolean(inferenceResult)}
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
  error,
  reviewed,
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
  error: unknown;
  reviewed: boolean;
  woundAssessmentId: string;
  capturedAt: string;
  onWoundAssessment: (value: string) => void;
  onCapturedAt: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const assessments = patient?.woundAssessments ?? [];
  const recordErrorMessage =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : language === "th"
        ? "ไม่สามารถโหลดข้อมูลผู้ป่วยที่เลือกได้"
        : "The selected patient record could not be loaded.";
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
      {error ? (
        <div className="camera-console-assignment-message is-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{recordErrorMessage}</span>
        </div>
      ) : !reviewed ? (
        <div className="camera-console-assignment-message" role="status">
          <Info aria-hidden="true" />
          <span>
            {language === "th"
              ? "ตรวจสอบภาพและผลสนับสนุนก่อนบันทึกเข้าระเบียน"
              : "Review the image and decision support before saving to the record."}
          </span>
        </div>
      ) : null}
      <label>
        <span>{t("woundAssessment")}</span>
        <select
          value={woundAssessmentId}
          onChange={event => onWoundAssessment(event.target.value)}
          disabled={saving || loading || Boolean(error)}
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
          disabled={saving || Boolean(error)}
        />
      </label>
      <Button
        onClick={onSave}
        disabled={saving || loading || Boolean(error) || !capturedAt || !reviewed}
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
      <small>
        {reviewed
          ? t("photoAssignmentNote")
          : language === "th"
            ? "ปุ่มบันทึกจะเปิดใช้หลังตรวจสอบภาพเสร็จ"
            : "Saving is enabled after image review is complete."}
      </small>
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

function diabetesContextKey(patient: {
  type1: number;
  type2: number;
  gdm: number;
}) {
  if (patient.type1) return "type1";
  if (patient.type2) return "type2";
  if (patient.gdm) return "gdm";
  return "none";
}
