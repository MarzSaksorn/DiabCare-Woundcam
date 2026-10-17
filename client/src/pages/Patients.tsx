import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/locale";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Filter,
  HeartPulse,
  ImageIcon,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "@/styles/patients-redesign.css";

const PAGE_SIZE = 12;
type ViewKind = "registered" | "imported";
type SearchMode = "patient" | "location" | "context";
type DiabetesContext = "all" | "type1" | "type2" | "gdm";
type Language = "th" | "en";
type MetricTone = "primary" | "cyan" | "amber" | "green";

type RegisteredPatient = {
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
  createdAt: Date | string;
};

type ImportedPatient = {
  id: number;
  sourceRowNumber: number;
  age: string;
  identifyBy: string;
  type1: number;
  type2: number;
  gdm: number;
  sex: "FEMALE" | "MALE";
  observationCount: number;
  createdAt: Date | string;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
  unavailable = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
  unavailable?: boolean;
}) {
  return (
    <article className={`patients-stitch-metric is-${tone}`}>
      <div className="patients-stitch-metric-heading">
        <span>{label}</span>
        <Icon aria-hidden="true" />
      </div>
      <strong className={unavailable ? "is-unavailable" : undefined}>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

export default function Patients() {
  const { language, t } = useLanguage();
  const [view, setView] = useState<ViewKind>("registered");
  const [searchMode, setSearchMode] = useState<SearchMode>("patient");
  const [context, setContext] = useState<DiabetesContext>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const registered = trpc.diabetes.registeredPatientsPage.useQuery(
    { query, context, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
    { retry: false }
  );
  const imported = trpc.diabetes.patientsPage.useQuery(
    { query, context, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
    { retry: false }
  );
  const importedSummary = trpc.diabetes.summary.useQuery(undefined, { retry: false });
  const clinicalSummary = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const activeQuery = view === "registered" ? registered : imported;
  const total = view === "registered" ? registered.data?.total ?? 0 : imported.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loading = activeQuery.isLoading;
  const error = activeQuery.error;
  const unavailable = language === "th" ? "ยังไม่ได้เชื่อมต่อฐานข้อมูล" : "Database not connected";
  const unavailableDetail = language === "th"
    ? "ตรวจสอบการตั้งค่า Supabase PostgreSQL ของเซิร์ฟเวอร์"
    : "Check the server Supabase PostgreSQL configuration.";
  const placeholder = searchMode === "patient"
    ? language === "th"
      ? "ค้นหาด้วยชื่อ-นามสกุล หรือเลขประจำตัว HN..."
      : "Search by patient name or HN code..."
    : searchMode === "location"
      ? language === "th"
        ? "ค้นหาตามพื้นที่ หรือตำบล..."
        : "Search by location or district..."
      : language === "th"
        ? "ค้นหาตามข้อมูลโรคร่วม..."
        : "Search by diabetes context...";

  function changeView(next: ViewKind) {
    setView(next);
    setPage(1);
    setQuery("");
    setContext("all");
  }

  function chooseContext(next: DiabetesContext) {
    setContext(next);
    setPage(1);
  }

  function refresh() {
    void registered.refetch();
    void imported.refetch();
    void importedSummary.refetch();
    void clinicalSummary.refetch();
  }

  return (
    <DashboardLayout>
      <main className="patients-stitch" aria-labelledby="patients-stitch-title">
        <header className="patients-stitch-titlebar">
          <div className="patients-stitch-title-copy">
            <div className="patients-stitch-eyebrow">
              {language === "th" ? "ทะเบียนผู้ป่วย" : "PATIENT REGISTRY"}
              <span aria-hidden="true" />
              <span>{language === "th" ? "DM FOOT CARE REGISTRY" : "CONNECTED PATIENT DIRECTORY"}</span>
            </div>
            <h1 id="patients-stitch-title">
              {language === "th"
                ? "ระบบทะเบียนและรายชื่อผู้ป่วย"
                : "Patient list directory"}
              <span>{language === "th" ? "(Patient List Directory)" : "Connected clinical records"}</span>
            </h1>
            <p>
              {language === "th"
                ? "ค้นหาและเปิดข้อมูลจากแหล่งที่มาจริง โดยคงแยกระเบียนคลินิกและกลุ่มนำเข้า"
                : "Search source records while keeping registered clinical and imported cohorts separate."}
            </p>
          </div>
          <div className="patients-stitch-title-actions">
            <button type="button" className="patients-stitch-button is-secondary" onClick={refresh}>
              <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {language === "th" ? "รีเฟรชข้อมูล" : "Refresh data"}
            </button>
            <Link href="/patients/new" className="patients-stitch-button is-primary">
              <Users aria-hidden="true" />
              {language === "th" ? "ลงทะเบียนผู้ป่วยใหม่" : "Register new patient"}
            </Link>
          </div>
        </header>

        <section className="patients-stitch-metrics" aria-label={language === "th" ? "ตัวชี้วัดผู้ป่วย" : "Patient metrics"}>
          <MetricCard
            icon={Users}
            tone="primary"
            label={language === "th" ? "ผู้ป่วยในมุมมองนี้" : "Patients in this view"}
            value={formatNumber(total, language)}
            helper={view === "registered"
              ? language === "th" ? "ระเบียนคลินิกที่ยังใช้งาน" : "Active clinical records"
              : language === "th" ? "ระเบียนจากแหล่งนำเข้า" : "Imported source records"}
          />
          <MetricCard
            icon={ClipboardList}
            tone="cyan"
            label={language === "th" ? "การประเมินแผลที่บันทึก" : "Recorded assessments"}
            value={clinicalSummary.data ? formatNumber(clinicalSummary.data.woundAssessmentCount, language) : "—"}
            helper={clinicalSummary.data
              ? language === "th" ? "รายการจากผู้ป่วยคลินิก" : "Linked clinical assessments"
              : unavailable}
            unavailable={!clinicalSummary.data}
          />
          <MetricCard
            icon={ImageIcon}
            tone="green"
            label={language === "th" ? "รูปแผลที่มองเห็น" : "Visible wound photos"}
            value={clinicalSummary.data ? formatNumber(clinicalSummary.data.visiblePhotoCount, language) : "—"}
            helper={clinicalSummary.data
              ? language === "th" ? "ไม่รวมสื่อที่ซ่อน" : "Hidden media excluded"
              : unavailable}
            unavailable={!clinicalSummary.data}
          />
          <MetricCard
            icon={CalendarDays}
            tone="amber"
            label={language === "th" ? "นัดหมายตรวจวันนี้" : "Appointments today"}
            value="—"
            helper={language === "th" ? "ยังไม่มีแหล่งข้อมูลนัดหมายที่เชื่อมต่อ" : "Appointment data is not connected"}
            unavailable
          />
        </section>

        <section className="patients-stitch-search-card" aria-label={language === "th" ? "ค้นหาและกรองผู้ป่วย" : "Search and filter patients"}>
          <div className="patients-stitch-search-row">
            <label className="patients-stitch-search-input">
              <Search aria-hidden="true" />
              <span className="sr-only">{language === "th" ? "ค้นหาระเบียน" : "Search records"}</span>
              <input
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={placeholder}
                type="search"
              />
              <kbd>Ctrl + K</kbd>
            </label>
            <div className="patients-stitch-source-toggle" role="tablist" aria-label={language === "th" ? "แหล่งข้อมูลผู้ป่วย" : "Patient source"}>
              <button type="button" role="tab" aria-selected={view === "registered"} className={view === "registered" ? "is-active" : ""} onClick={() => changeView("registered")}>
                {language === "th" ? "คลินิก" : "Clinical"}
              </button>
              <button type="button" role="tab" aria-selected={view === "imported"} className={view === "imported" ? "is-active" : ""} onClick={() => changeView("imported")}>
                {language === "th" ? "นำเข้า" : "Imported"}
              </button>
            </div>
          </div>
          <div className="patients-stitch-search-modes" role="tablist" aria-label={language === "th" ? "ประเภทการค้นหา" : "Search mode"}>
            <button type="button" role="tab" aria-selected={searchMode === "patient"} className={searchMode === "patient" ? "is-active" : ""} onClick={() => setSearchMode("patient")}>
              <UserRound aria-hidden="true" /> {language === "th" ? "ชื่อ / HN" : "Name / HN"}
            </button>
            <button type="button" role="tab" aria-selected={searchMode === "location"} className={searchMode === "location" ? "is-active" : ""} onClick={() => setSearchMode("location")}>
              <MapPin aria-hidden="true" /> {language === "th" ? "พื้นที่ / ตำบล" : "Location"}
            </button>
            <button type="button" role="tab" aria-selected={searchMode === "context"} className={searchMode === "context" ? "is-active" : ""} onClick={() => setSearchMode("context")}>
              <HeartPulse aria-hidden="true" /> {language === "th" ? "โรคร่วม" : "Comorbidity"}
            </button>
          </div>
          <div className="patients-stitch-filter-row">
            <span className="patients-stitch-filter-label"><Filter aria-hidden="true" /> {language === "th" ? "กรองข้อมูล:" : "Filters:"}</span>
            <FilterChip active={context === "all"} label={language === "th" ? "ทั้งหมด" : "All"} value={context === "all" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("all")} />
            <FilterChip disabled label={language === "th" ? "นัดวันนี้" : "Appointments"} value="—" />
            <FilterChip disabled label={language === "th" ? "เสี่ยงสูง" : "High risk"} value="—" tone="amber" />
            <FilterChip disabled label={language === "th" ? "วิกฤต" : "Critical"} value="—" tone="error" />
            <FilterChip active={context === "type1"} label="Type 1" value={context === "type1" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("type1")} />
            <FilterChip active={context === "type2"} label="Type 2" value={context === "type2" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("type2")} />
            <FilterChip active={context === "gdm"} label="GDM" value={context === "gdm" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("gdm")} />
          </div>
        </section>

        <section className="patients-stitch-table-card" aria-labelledby="patients-stitch-table-title">
          <div className="patients-stitch-table-heading">
            <div>
              <span className="patients-stitch-section-kicker">{language === "th" ? "ระเบียนจากฐานข้อมูล" : "CONNECTED RECORDS"}</span>
              <h2 id="patients-stitch-table-title">{view === "registered" ? (language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients") : (language === "th" ? "ข้อมูลผู้ป่วยนำเข้า" : "Imported patient cohort")}</h2>
            </div>
            <span>{language === "th" ? `พบ ${formatNumber(total, language)} ราย` : `Found ${formatNumber(total, language)} records`}</span>
          </div>
          {loading && <LoadingRows />}
          {!loading && error && (
            <div className="patients-stitch-empty is-error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <strong>{language === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Records could not be loaded"}</strong>
              <p>{unavailableDetail}</p>
              <button type="button" className="patients-stitch-inline-button" onClick={refresh}>{t("tryAgain")} <ArrowRight aria-hidden="true" /></button>
            </div>
          )}
          {!loading && !error && total === 0 && (
            <div className="patients-stitch-empty">
              <Search aria-hidden="true" />
              <strong>{query || context !== "all"
                ? language === "th" ? "ไม่พบระเบียนที่ตรงกัน" : "No matching records"
                : view === "registered"
                  ? language === "th" ? "ยังไม่มีผู้ป่วยที่ลงทะเบียน" : "No registered patients yet"
                  : language === "th" ? "ยังไม่มีข้อมูลนำเข้า" : "No imported records yet"}</strong>
              <p>{query || context !== "all"
                ? language === "th" ? "ลองใช้คำค้นหาหรือตัวกรองอื่น" : "Try a different search term or filter."
                : language === "th" ? "ข้อมูลที่บันทึกจากระบบเชื่อมต่อจะแสดงที่นี่" : "Records from the connected backend will appear here."}</p>
            </div>
          )}
          {!loading && !error && total > 0 && (
            <div className="patients-stitch-table-scroll">
              <table className="patients-stitch-table">
                <thead>
                  <tr>
                    <th>{language === "th" ? "ชื่อ-นามสกุล / เลขประจำตัว" : "Patient / identifier"}</th>
                    <th>{language === "th" ? "ประเภทเบาหวานและอายุ" : "Diabetes context & age"}</th>
                    <th>{language === "th" ? "ข้อมูลทางคลินิก" : "Clinical data"}</th>
                    <th>{language === "th" ? "แหล่งข้อมูล" : "Source"}</th>
                    <th>{language === "th" ? "บันทึกล่าสุด" : "Last record"}</th>
                    <th><span className="sr-only">{language === "th" ? "เปิดระเบียน" : "Open record"}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {view === "registered" && registered.data?.patients.map(patient => (
                    <RegisteredPatientRow key={`registered-${patient.id}`} patient={patient} language={language} />
                  ))}
                  {view === "imported" && imported.data?.patients.map(patient => (
                    <ImportedPatientRow key={`imported-${patient.id}`} patient={patient} language={language} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && total > 0 && (
            <div className="patients-stitch-pagination">
              <span>{language === "th" ? `หน้า ${page} จาก ${pageCount}` : `Page ${page} of ${pageCount}`}</span>
              <div>
                <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>{language === "th" ? "ก่อนหน้า" : "Previous"}</button>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>{language === "th" ? "ถัดไป" : "Next"}</button>
              </div>
            </div>
          )}
        </section>

        <section className="patients-stitch-safety" aria-label={language === "th" ? "ความปลอดภัยทางคลินิก" : "Clinical safety note"}>
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>{t("decisionSupport")}</strong>
            <p>{language === "th" ? "ข้อมูลนำเข้าเป็นค่าที่เก็บรักษาจากต้นทาง ไม่ใช่การยืนยันตัวตนหรือการวินิจฉัยผู้ป่วย" : "Imported values preserve source provenance. They do not identify or diagnose a clinical patient."}</p>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}

function diabetesContext(patient: { type1: number; type2: number; gdm: number }, language: Language) {
  if (patient.type1) return "Type 1";
  if (patient.type2) return "Type 2";
  if (patient.gdm) return "GDM";
  return language === "th" ? "ไม่ได้บันทึก" : "Not recorded";
}

function sexLabel(sex: "FEMALE" | "MALE", language: Language) {
  return sex === "FEMALE" ? (language === "th" ? "หญิง" : "Female") : (language === "th" ? "ชาย" : "Male");
}

function RegisteredPatientRow({ patient, language }: { patient: RegisteredPatient; language: Language }) {
  return (
    <tr className="patients-stitch-row">
      <td>
        <Link href={`/patients/registered/${patient.id}`} className="patients-stitch-patient-cell">
          <span className="patients-stitch-avatar">{(patient.displayName || patient.patientCode).slice(0, 1)}</span>
          <span>
            <strong>{patient.displayName || patient.patientCode}</strong>
            <small>HN: {patient.patientCode}</small>
          </span>
        </Link>
      </td>
      <td>
        <span className="patients-stitch-context-badge">{diabetesContext(patient, language)}</span>
        <small className="patients-stitch-secondary">{patient.age ?? "—"} {language === "th" ? "ปี" : "years"} · {sexLabel(patient.sex, language)}</small>
      </td>
      <td>
        <strong className="patients-stitch-data-value">{formatNumber(patient.observationCount, language)}</strong>
        <small className="patients-stitch-secondary">{language === "th" ? "การสังเกต" : "observations"}</small>
      </td>
      <td>
        <span className="patients-stitch-source-badge is-clinical"><CheckCircle2 aria-hidden="true" /> {language === "th" ? "คลินิก" : "Clinical"}</span>
        <small className="patients-stitch-secondary">{patient.registrationLocation}</small>
      </td>
      <td>
        <strong className="patients-stitch-date-value">{formatDate(patient.createdAt, language)}</strong>
        <small className="patients-stitch-secondary">{language === "th" ? "ลงทะเบียน" : "Registered"}</small>
      </td>
      <td className="patients-stitch-row-action">
        <Link href={`/patients/registered/${patient.id}`} aria-label={`${language === "th" ? "เปิดระเบียน" : "Open record"}: ${patient.displayName || patient.patientCode}`}>
          <ArrowRight aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function ImportedPatientRow({ patient, language }: { patient: ImportedPatient; language: Language }) {
  return (
    <tr className="patients-stitch-row is-imported">
      <td>
        <Link href={`/patients/${patient.id}`} className="patients-stitch-patient-cell">
          <span className="patients-stitch-avatar is-cyan"><FileText aria-hidden="true" /></span>
          <span>
            <strong>{language === "th" ? `ระเบียนนำเข้า #${patient.sourceRowNumber}` : `Imported record #${patient.sourceRowNumber}`}</strong>
            <small>{patient.identifyBy}</small>
          </span>
        </Link>
      </td>
      <td>
        <span className="patients-stitch-context-badge is-secondary">{diabetesContext(patient, language)}</span>
        <small className="patients-stitch-secondary">{patient.age} {language === "th" ? "ปี" : "years"} · {sexLabel(patient.sex, language)}</small>
      </td>
      <td>
        <strong className="patients-stitch-data-value">{formatNumber(patient.observationCount, language)}</strong>
        <small className="patients-stitch-secondary">{language === "th" ? "การสังเกต" : "observations"}</small>
      </td>
      <td>
        <span className="patients-stitch-source-badge is-imported"><Database aria-hidden="true" /> {language === "th" ? "ต้นทาง" : "Source"}</span>
        <small className="patients-stitch-secondary">{patient.identifyBy}</small>
      </td>
      <td>
        <strong className="patients-stitch-date-value">{formatDate(patient.createdAt, language)}</strong>
        <small className="patients-stitch-secondary">{language === "th" ? "นำเข้าเมื่อ" : "Imported"}</small>
      </td>
      <td className="patients-stitch-row-action">
        <Link href={`/patients/${patient.id}`} aria-label={`${language === "th" ? "เปิดระเบียน" : "Open record"}: ${patient.sourceRowNumber}`}>
          <ArrowRight aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function FilterChip({
  label,
  value,
  active = false,
  disabled = false,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  active?: boolean;
  disabled?: boolean;
  tone?: "default" | "amber" | "error";
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`patients-stitch-filter-chip ${active ? "is-active" : ""} ${disabled ? "is-disabled" : ""} is-${tone}`} disabled={disabled} onClick={onClick}>
      {tone !== "default" && <span className="patients-stitch-filter-dot" aria-hidden="true" />}
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="patients-stitch-loading" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}
