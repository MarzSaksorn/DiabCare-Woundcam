import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiagnosticCamera, {
  getDiagnosticPageCopy,
  getPreviewModeLabel,
  getDiagnosticWorkflowSteps,
} from "./DiagnosticCamera";

const diagnosticState = vi.hoisted(() => {
  type PatientQuery = {
    data: unknown;
    isLoading: boolean;
    error: unknown;
  };
  let patientQuery: PatientQuery = {
    data: { patients: [], total: 0 },
    isLoading: false,
    error: null,
  };
  let language = "en";

  return {
    getPatientQuery: () => patientQuery,
    setPatientData: (data: unknown) => {
      patientQuery = { ...patientQuery, data };
    },
    setPatientLoading: (isLoading: boolean) => {
      patientQuery = { ...patientQuery, isLoading };
    },
    setPatientError: (error: unknown) => {
      patientQuery = { ...patientQuery, error };
    },
    getLanguage: () => language,
    setLanguage: (next: string) => {
      language = next;
    },
  };
});

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children, bottomDock }: { children: React.ReactNode; bottomDock?: React.ReactNode }) => (
    <div>
      {children}
      {bottomDock && <aside className="test-bottom-dock">{bottomDock}</aside>}
    </div>
  ),
}));

vi.mock("@/components/DiagnosticPhotoHistory", () => ({
  default: () => <section aria-label="Photo history fixture" />,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: diagnosticState.getLanguage(),
    t: (key: string) => {
      if (key === "loading") return diagnosticState.getLanguage() === "th" ? "กำลังโหลด" : "Loading";
      return key;
    },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    diabetes: {
      registeredPatientsPage: {
        useQuery: (input: { context: string; limit: number }) => {
          if (input.limit === 100) return diagnosticState.getPatientQuery();
          return { data: { patients: [], total: input.context === "all" ? 0 : 0 }, isLoading: false, error: null };
        },
      },
      registeredPatientRecord: {
        useQuery: () => ({ data: undefined, isLoading: false, error: null }),
      },
      uploadWoundPhoto: {
        useMutation: () => ({ mutate: () => undefined, isPending: false }),
      },
    },
    wound: {
      infer: {
        useMutation: () => ({ mutateAsync: async () => undefined }),
      },
    },
  },
}));

function renderCamera() {
  return renderToStaticMarkup(<DiagnosticCamera />);
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  diagnosticState.setLanguage("en");
  diagnosticState.setPatientData({ patients: [], total: 0 });
  diagnosticState.setPatientLoading(false);
  diagnosticState.setPatientError(null);
});

describe("DiagnosticCamera patient gate", () => {
  it("renders an honest, bilingual empty state without fabricated patient rows", () => {
    const englishMarkup = renderCamera();
    expect(englishMarkup).toContain("Wound photography");
    expect(englishMarkup).toContain("<h1");
    expect(englishMarkup).toContain("0 records");
    expect(englishMarkup).toContain("No patients match your search");
    expect(englishMarkup).toContain("Try a different search or diabetes type.");
    expect(englishMarkup).toContain('id="capture-history"');
    expect(englishMarkup).not.toContain("Patient display name");

    diagnosticState.setLanguage("th");
    const thaiMarkup = renderCamera();
    expect(thaiMarkup).toContain("ไม่พบรายชื่อผู้ป่วยที่ตรงกับการค้นหา");
    expect(thaiMarkup).toContain("ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองประเภทอื่น");
  });

  it("announces patient loading and errors instead of presenting them as empty results", () => {
    diagnosticState.setPatientLoading(true);
    const loadingMarkup = renderCamera();
    expect(loadingMarkup).toContain('class="camera-console-stitch-selector-loading"');
    expect(loadingMarkup).toContain('aria-label="Loading"');

    diagnosticState.setPatientLoading(false);
    diagnosticState.setPatientError(new Error("Register is unavailable"));
    const errorMarkup = renderCamera();
    expect(errorMarkup).toContain('role="alert"');
    expect(errorMarkup).toContain("Patients could not be loaded");
    expect(errorMarkup).toContain("Register is unavailable");
    expect(errorMarkup).not.toContain("0 records");
    expect(errorMarkup).not.toContain("No patients match your search");
  });

  it("keeps patient search, diabetes filters, selected-row controls, confirmation, and history navigation", () => {
    diagnosticState.setPatientData({
      patients: [{
        id: 42,
        patientCode: "W-42",
        displayName: "Connected patient",
        age: 66,
        registrationLocation: "Outpatient clinic",
        identifyBy: "registry",
        type1: 1,
        type2: 0,
        gdm: 0,
        sex: "FEMALE",
        observationCount: 1,
      }],
      total: 1,
    });
    const markup = renderCamera();

    expect(markup).toContain('aria-label="Search patients"');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-label="Select Connected patient"');
    expect(markup).toContain("HN: W-42");
    expect(markup).toContain('class="bottom-nav-confirmation"');
    expect(markup).toContain("No patient selected");
    expect(markup).toContain("Continue");
    expect(markup).toContain('id="capture-history"');
  });

  it("uses distinct, truthful labels for live preview and manual model review", () => {
    const markup = renderCamera();
    expect(markup).not.toContain("AI LIVE ASSIST");
    expect(markup).not.toContain("Live AI assist");
    expect(markup).toContain("Wound photography");
    expect(markup).toContain("Choose a diabetes patient");

    const captureCopy = getDiagnosticPageCopy({
      language: "en",
      stage: "capture",
    });
    expect(captureCopy.title).toBe("Capture a wound image");
    expect(captureCopy.description).toContain("No diagnosis is made");
    expect(captureCopy.description).not.toContain("Live AI");
    expect(
      getPreviewModeLabel({ language: "en", mode: "live" })
    ).toBe("Camera live preview");
    expect(
      getPreviewModeLabel({ language: "en", mode: "captured" })
    ).toBe("Image ready for review");
    expect(
      getPreviewModeLabel({ language: "en", mode: "processing" })
    ).toBe("Review in progress");
    expect(
      getPreviewModeLabel({ language: "en", mode: "processed" })
    ).toBe("Model result available");
    expect(
      getPreviewModeLabel({ language: "th", mode: "live" })
    ).toBe("แสดงภาพสดจากกล้อง");
    expect(
      getDiagnosticPageCopy({ language: "th", stage: "capture" }).title
    ).toBe("ถ่ายภาพแผล");
  });

  it("reports capture, review, and save readiness only when the real workflow state allows it", () => {
    const initialSteps = getDiagnosticWorkflowSteps({
      language: "en",
      captureState: "idle",
      cameraState: "closed",
      hasImage: false,
      hasInferenceResult: false,
      recordLoaded: false,
      recordLoading: false,
      recordError: false,
      hasCapturedAt: false,
      saving: false,
    });
    expect(initialSteps.map(step => step.status)).toEqual([
      "Image needed",
      "Waiting for image",
      "Record unavailable",
    ]);
    expect(initialSteps.map(step => step.state)).toEqual([
      "current",
      "pending",
      "pending",
    ]);

    const capturedSteps = getDiagnosticWorkflowSteps({
      language: "en",
      captureState: "preview",
      cameraState: "closed",
      hasImage: true,
      hasInferenceResult: false,
      recordLoaded: true,
      recordLoading: false,
      recordError: false,
      hasCapturedAt: true,
      saving: false,
    });
    expect(capturedSteps.map(step => step.status)).toEqual([
      "Image selected",
      "Waiting for review",
      "Available after review",
    ]);

    const reviewedSteps = getDiagnosticWorkflowSteps({
      language: "en",
      captureState: "ready",
      cameraState: "closed",
      hasImage: true,
      hasInferenceResult: true,
      recordLoaded: true,
      recordLoading: false,
      recordError: false,
      hasCapturedAt: true,
      saving: false,
    });
    expect(reviewedSteps.map(step => step.status)).toEqual([
      "Image selected",
      "Model result available",
      "Ready to save",
    ]);
    expect(reviewedSteps.map(step => step.state)).toEqual([
      "complete",
      "complete",
      "current",
    ]);
    expect(reviewedSteps[2]?.detail).toBe(
      "Capture time required; assessment is optional."
    );

    const thaiReviewSteps = getDiagnosticWorkflowSteps({
      language: "th",
      captureState: "analyzing",
      cameraState: "closed",
      hasImage: true,
      hasInferenceResult: false,
      recordLoaded: true,
      recordLoading: false,
      recordError: false,
      hasCapturedAt: true,
      saving: false,
    });
    expect(thaiReviewSteps[1]?.status).toBe("กำลังตรวจสอบ");
    expect(thaiReviewSteps[2]?.detail).toBe(
      "ต้องระบุเวลาถ่ายภาพ ส่วนการประเมินเป็นทางเลือก"
    );
  });
});
