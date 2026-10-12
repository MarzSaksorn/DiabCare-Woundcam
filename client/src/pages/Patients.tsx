import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Database, FileText, Filter, HeartPulse, MapPin, RefreshCw, Search, ShieldAlert, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 12;
type ViewKind = "registered" | "imported";
type SearchMode = "patient" | "location" | "context";
type DiabetesContext = "all" | "type1" | "type2" | "gdm";

export default function Patients() {
  const { language, t } = useLanguage();
  const [view, setView] = useState<ViewKind>("registered");
  const [searchMode, setSearchMode] = useState<SearchMode>("patient");
  const [context, setContext] = useState<DiabetesContext>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const registered = trpc.diabetes.registeredPatientsPage.useQuery({ query, context, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }, { retry: false });
  const imported = trpc.diabetes.patientsPage.useQuery({ query, context, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }, { retry: false });
  const summary = trpc.diabetes.summary.useQuery(undefined, { retry: false });
  const activeQuery = view === "registered" ? registered : imported;
  const total = view === "registered" ? registered.data?.total ?? 0 : imported.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loading = activeQuery.isLoading;
  const error = activeQuery.error;
  const placeholder = searchMode === "patient" ? (language === "th" ? "ค้นหาข้อมูลคนไข้ตามชื่อ หรือรหัสประจำตัว HN..." : "Search by patient name or HN code...") : searchMode === "location" ? (language === "th" ? "ค้นหาตามพื้นที่ หรือตำบล..." : "Search by location or district...") : (language === "th" ? "ค้นหาตามข้อมูลโรคร่วม..." : "Search by diabetes context...");

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
    void summary.refetch();
  }

  return <DashboardLayout>
    <div className="replica-page patients-replica-page">
      <header className="patients-replica-header"><div><span className="replica-eyebrow"><span /> {language === "th" ? "ทะเบียนผู้ป่วย" : "PATIENT REGISTRY"}</span><h1>{language === "th" ? "รายชื่อคนไข้เป้าหมาย" : "Patient registry"}</h1><p>{language === "th" ? "ค้นหาและเปิดข้อมูลจากแหล่งที่มาจริง โดยคงแยกระเบียนคลินิกและกลุ่มนำเข้า" : "Search and open source records while keeping registered clinical and imported cohorts separate."}</p></div><div className="patients-replica-actions"><button type="button" onClick={refresh} className="replica-secondary-button"><RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" /> {t("refresh")}</button><Link href="/patients/new" className="replica-primary-button"><Users aria-hidden="true" /> {t("registerPatient")}</Link></div></header>

      <section className="patients-source-bar"><div className="patients-source-heading"><Database aria-hidden="true" /><div><strong>{view === "registered" ? (language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients") : (language === "th" ? "ข้อมูลผู้ป่วยนำเข้า" : "Imported patient cohort")}</strong><small>{view === "registered" ? (language === "th" ? "ระเบียนคลินิกที่ยังใช้งาน" : "Active clinical records") : (summary.data?.batch?.sourceFilename || (language === "th" ? "แหล่งข้อมูลนำเข้า" : "Imported source data"))}</small></div></div><div className="patients-source-toggle" role="tablist" aria-label={language === "th" ? "แหล่งข้อมูลผู้ป่วย" : "Patient source"}><button type="button" role="tab" aria-selected={view === "registered"} className={view === "registered" ? "is-active" : ""} onClick={() => changeView("registered")}>{language === "th" ? "คลินิก" : "Clinical"}</button><button type="button" role="tab" aria-selected={view === "imported"} className={view === "imported" ? "is-active" : ""} onClick={() => changeView("imported")}>{language === "th" ? "นำเข้า" : "Imported"}</button></div></section>

      <section className="patients-replica-controls"><div className="patients-search-modes" role="tablist" aria-label={language === "th" ? "ประเภทการค้นหา" : "Search mode"}><button type="button" role="tab" aria-selected={searchMode === "patient"} className={searchMode === "patient" ? "is-active" : ""} onClick={() => setSearchMode("patient")}><UserRound aria-hidden="true" /> {language === "th" ? "ชื่อ / HN" : "Name / HN"}</button><button type="button" role="tab" aria-selected={searchMode === "location"} className={searchMode === "location" ? "is-active" : ""} onClick={() => setSearchMode("location")}><MapPin aria-hidden="true" /> {language === "th" ? "พื้นที่ / ตำบล" : "Location"}</button><button type="button" role="tab" aria-selected={searchMode === "context"} className={searchMode === "context" ? "is-active" : ""} onClick={() => setSearchMode("context")}><HeartPulse aria-hidden="true" /> {language === "th" ? "โรคร่วม" : "Comorbidity"}</button></div><div className="patients-replica-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={placeholder} aria-label={language === "th" ? "ค้นหาระเบียน" : "Search records"} /></div></section>

      <section className="patients-filter-strip" aria-label={language === "th" ? "ตัวกรองผู้ป่วย" : "Patient filters"}><Filter aria-hidden="true" /><FilterChip active={context === "all"} label={language === "th" ? "ทั้งหมด" : "All"} value={context === "all" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("all")} /><FilterChip disabled label={language === "th" ? "นัดวันนี้" : "Appointments"} value="—" /><FilterChip disabled label={language === "th" ? "เสี่ยงสูง" : "High risk"} value="—" /><FilterChip disabled label={language === "th" ? "วิกฤต" : "Critical"} value="—" /><FilterChip active={context === "type1"} label="Type 1" value={context === "type1" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("type1")} /><FilterChip active={context === "type2"} label="Type 2" value={context === "type2" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("type2")} /><FilterChip active={context === "gdm"} label="GDM" value={context === "gdm" ? formatNumber(total, language) : "—"} onClick={() => chooseContext("gdm")} /></section>

      <section className="patients-replica-list-section"><div className="patients-replica-list-heading"><div><span className="replica-eyebrow">{language === "th" ? "ระเบียนจากฐานข้อมูล" : "CONNECTED RECORDS"}</span><h2>{language === "th" ? "รายชื่อคนไข้เป้าหมาย" : "Connected patient records"}</h2></div><span>{language === "th" ? "พบ " : "Found "}{formatNumber(total, language)} {language === "th" ? "ราย" : "records"}</span></div>
        {loading && <LoadingCards />}
        {!loading && error && <div className="replica-empty-state is-error"><AlertTriangle aria-hidden="true" /><strong>{language === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Records could not be loaded"}</strong><p>{language === "th" ? "ระบบจะแสดงข้อผิดพลาดแทนการเติมข้อมูลตัวอย่าง" : "The app shows the failure instead of filling the view with sample records."}</p><button type="button" className="replica-text-button" onClick={refresh}>{t("tryAgain")} <ArrowRight aria-hidden="true" /></button></div>}
        {!loading && !error && total === 0 && <div className="replica-empty-state"><Search aria-hidden="true" /><strong>{query || context !== "all" ? (language === "th" ? "ไม่พบระเบียนที่ตรงกัน" : "No matching records") : (view === "registered" ? (language === "th" ? "ยังไม่มีผู้ป่วยที่ลงทะเบียน" : "No registered patients yet") : (language === "th" ? "ยังไม่มีข้อมูลนำเข้า" : "No imported records yet"))}</strong><p>{query || context !== "all" ? (language === "th" ? "ลองใช้คำค้นหาหรือตัวกรองอื่น" : "Try a different search term or filter.") : (language === "th" ? "ข้อมูลที่บันทึกจากระบบเชื่อมต่อจะแสดงที่นี่" : "Records from the connected backend will appear here.")}</p></div>}
        {!loading && !error && total > 0 && <div className="patients-replica-cards">{view === "registered" && registered.data?.patients.map((patient) => <RegisteredPatientCard key={`registered-${patient.id}`} patient={patient} language={language} />)}{view === "imported" && imported.data?.patients.map((patient) => <ImportedPatientCard key={`imported-${patient.id}`} patient={patient} language={language} />)}</div>}
        {!loading && !error && total > 0 && <div className="patients-pagination"><span>{language === "th" ? `หน้า ${page} จาก ${pageCount}` : `Page ${page} of ${pageCount}`}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{language === "th" ? "ก่อนหน้า" : "Previous"}</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{language === "th" ? "ถัดไป" : "Next"}</button></div></div>}
      </section>

      <section className="replica-panel replica-safety-banner"><ShieldAlert aria-hidden="true" /><div><strong>{t("decisionSupport")}</strong><p>{language === "th" ? "ข้อมูลนำเข้าเป็นค่าที่เก็บรักษาจากต้นทาง ไม่ใช่การยืนยันตัวตนหรือการวินิจฉัยผู้ป่วย" : "Imported values preserve source provenance. They don't identify or diagnose a clinical patient."}</p></div></section>
    </div>
  </DashboardLayout>;
}

type RegisteredPatient = { id: number; patientCode: string; displayName: string | null; age: number | null; registrationLocation: string; identifyBy: string; type1: number; type2: number; gdm: number; sex: "FEMALE" | "MALE"; observationCount: number; createdAt: Date | string };
type ImportedPatient = { id: number; sourceRowNumber: number; age: string; identifyBy: string; type1: number; type2: number; gdm: number; sex: "FEMALE" | "MALE"; observationCount: number; createdAt: Date | string };

type Language = "th" | "en";
function diabetesContext(patient: { type1: number; type2: number; gdm: number }, language: Language) { if (patient.type1) return "Type 1"; if (patient.type2) return "Type 2"; if (patient.gdm) return "GDM"; return language === "th" ? "ไม่ได้บันทึก" : "Not recorded"; }
function sexLabel(sex: "FEMALE" | "MALE", language: Language) { return sex === "FEMALE" ? (language === "th" ? "หญิง" : "Female") : (language === "th" ? "ชาย" : "Male"); }

function RegisteredPatientCard({ patient, language }: { patient: RegisteredPatient; language: Language }) { return <Link href={`/patients/registered/${patient.id}`} className="patient-replica-card"><span className="patient-replica-avatar"><Users aria-hidden="true" /></span><span className="patient-replica-main"><strong>{patient.displayName || patient.patientCode}</strong><small>{patient.patientCode} · {patient.age ?? "—"} {language === "th" ? "ปี" : "years"} · {diabetesContext(patient, language)}</small><span className="patient-replica-meta"><span>{patient.observationCount} {language === "th" ? "การสังเกต" : "observations"}</span><span>{patient.registrationLocation}</span></span></span><span className="patient-replica-status is-clinical"><CheckCircle2 aria-hidden="true" /> {language === "th" ? "คลินิก" : "Clinical"}</span><span className="patient-replica-date">{language === "th" ? "ลงทะเบียนล่าสุด" : "Registered"}<strong>{formatDate(patient.createdAt, language)}</strong></span><ArrowRight className="patient-replica-arrow" aria-hidden="true" /></Link>; }
function ImportedPatientCard({ patient, language }: { patient: ImportedPatient; language: Language }) { return <Link href={`/patients/${patient.id}`} className="patient-replica-card is-imported"><span className="patient-replica-avatar is-cyan"><FileText aria-hidden="true" /></span><span className="patient-replica-main"><strong>{language === "th" ? `ระเบียนนำเข้า #${patient.sourceRowNumber}` : `Imported record #${patient.sourceRowNumber}`}</strong><small>{patient.age} {language === "th" ? "ปี" : "years"} · {sexLabel(patient.sex, language)} · {diabetesContext(patient, language)}</small><span className="patient-replica-meta"><span>{patient.observationCount} {language === "th" ? "การสังเกต" : "observations"}</span><span>{patient.identifyBy}</span></span></span><span className="patient-replica-status is-imported"><Database aria-hidden="true" /> {language === "th" ? "ต้นทาง" : "Source"}</span><span className="patient-replica-date">{language === "th" ? "นำเข้าเมื่อ" : "Imported"}<strong>{formatDate(patient.createdAt, language)}</strong></span><ArrowRight className="patient-replica-arrow" aria-hidden="true" /></Link>; }

function FilterChip({ label, value, active = false, disabled = false, onClick }: { label: string; value: string; active?: boolean; disabled?: boolean; onClick?: () => void }) { return <button type="button" className={`patients-filter-chip ${active ? "is-active" : ""} ${disabled ? "is-disabled" : ""}`} disabled={disabled} onClick={onClick}><span>{label}</span><strong>{value}</strong></button>; }
function LoadingCards() { return <div className="patients-loading-cards"><span /><span /><span /></div>; }
