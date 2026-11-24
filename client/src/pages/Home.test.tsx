import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const homeState = vi.hoisted(() => {
  type DashboardState = {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
  };
  let dashboardState: DashboardState = {
    data: undefined,
    isLoading: false,
    isError: true,
  };
  let importedState: { data: unknown } = { data: undefined };
  let language = "en";

  return {
    getDashboard: () => dashboardState,
    setDashboard: (next: DashboardState) => {
      dashboardState = next;
    },
    getImported: () => importedState,
    setImported: (next: { data: unknown }) => {
      importedState = next;
    },
    getLanguage: () => language,
    setLanguage: (next: string) => {
      language = next;
    },
  };
});

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: homeState.getLanguage(),
    t: (key: string) => {
      if (key === "decisionSupport") {
        return homeState.getLanguage() === "th" ? "การสนับสนุนการตัดสินใจ" : "Decision support";
      }
      return key;
    },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    dashboard: { summary: { useQuery: () => homeState.getDashboard() } },
    diabetes: { summary: { useQuery: () => homeState.getImported() } },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function renderHome() {
  return renderToStaticMarkup(<Home />);
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  homeState.setLanguage("en");
  homeState.setDashboard({ data: undefined, isLoading: false, isError: true });
  homeState.setImported({ data: undefined });
});

describe("Home clinical dashboard", () => {
  it("keeps the dashboard content order, two main actions, Reports access, and safety language", () => {
    const markup = renderHome();
    const sectionLabels = [
      "Clinical overview",
      "Key metrics",
      "Appointments",
      "Overall wound healing trend",
      "Today’s schedule",
      "Wound-photo history",
      "Clinical safety note",
    ];
    const positions = sectionLabels.map(label => markup.indexOf(label));

    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(markup).toContain("Review registered patients, wound assessments, and saved wound photos.");
    expect(markup).toContain('href="/camera"');
    expect(markup).toContain('href="/patients/new"');
    expect(markup).toContain('href="/reports"');
    expect(markup).toContain("Decision support");
    expect(markup).toContain("Model output supports review only. A qualified clinician must verify it before any care decision.");
    expect(markup).not.toContain("Welcome to the diabetic wound care center");
  });

  it("shows successful zero counts as zero instead of unavailable dashes", () => {
    homeState.setDashboard({
      data: {
        registeredPatientCount: 0,
        woundAssessmentCount: 0,
        visiblePhotoCount: 0,
        recentPhotos: [],
      },
      isLoading: false,
      isError: false,
    });

    const markup = renderHome();
    const zeroValues = markup.match(/<strong>0<\/strong>/g) ?? [];

    expect(zeroValues).toHaveLength(3);
    expect(markup).toContain("No wound photos");
    expect(markup).not.toContain('class="home-stitch-metric-value"><strong class="is-unavailable">—</strong>');
  });

  it("distinguishes summary failure from an empty success", () => {
    const markup = renderHome();

    expect(markup).toContain("Database not connected");
    expect(markup).toContain("Check the server Supabase PostgreSQL configuration.");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("No wound photos");
  });

  it("announces photo-history loading and keeps separate loading, error, empty, and populated states", () => {
    homeState.setDashboard({ data: undefined, isLoading: true, isError: false });
    const loadingMarkup = renderHome();
    expect(loadingMarkup).toContain('role="status"');
    expect(loadingMarkup).toContain('aria-live="polite"');

    homeState.setDashboard({ data: undefined, isLoading: false, isError: true });
    const errorMarkup = renderHome();
    expect(errorMarkup).toContain("Database not connected");
    expect(errorMarkup).toContain('role="alert"');

    homeState.setDashboard({
      data: { registeredPatientCount: 0, woundAssessmentCount: 0, visiblePhotoCount: 0, recentPhotos: [] },
      isLoading: false,
      isError: false,
    });
    const emptyMarkup = renderHome();
    expect(emptyMarkup).toContain("No wound photos");
    expect(emptyMarkup).toContain('href="/camera"');

    homeState.setDashboard({
      data: {
        registeredPatientCount: 1,
        woundAssessmentCount: 1,
        visiblePhotoCount: 1,
        recentPhotos: [{
          id: 7,
          patientId: 42,
          displayName: "Connected patient",
          patientCode: "P-42",
          fileName: "wound-photo.jpg",
          capturedAt: new Date("2026-11-20T09:00:00.000Z"),
          createdAt: new Date("2026-11-20T09:00:00.000Z"),
        }],
      },
      isLoading: false,
      isError: false,
    });
    const populatedMarkup = renderHome();
    expect(populatedMarkup).toContain('href="/patients/registered/42"');
    expect(populatedMarkup).toContain("Connected patient");
    expect(populatedMarkup).toContain("wound-photo.jpg");
    expect(populatedMarkup).toContain('href="/camera#capture-history"');
  });

  it("keeps the imported cohort note separate and bilingual", () => {
    homeState.setImported({ data: { batch: { id: "test-batch" }, patientCount: 5 } });
    const englishMarkup = renderHome();
    expect(englishMarkup).toContain("Imported cohort");
    expect(englishMarkup).toContain("kept separate from registered clinical patients");

    homeState.setLanguage("th");
    const thaiMarkup = renderHome();
    expect(thaiMarkup).toContain("ข้อมูลกลุ่มนำเข้า");
    expect(thaiMarkup).toContain("แสดงแยกจากผู้ป่วยที่ลงทะเบียน");
    expect(thaiMarkup).toContain("ผลจากโมเดลเป็นข้อมูลช่วยทบทวนเท่านั้น ผู้เชี่ยวชาญต้องตรวจสอบก่อนตัดสินใจดูแล");
  });
});
