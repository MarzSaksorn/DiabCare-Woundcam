import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Database, FileText, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 12;
type ViewKind = "registered" | "imported";

export default function Patients() {
  const { language, t } = useLanguage();
  const [view, setView] = useState<ViewKind>("registered");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const registered = trpc.diabetes.registeredPatientsPage.useQuery({ query, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }, { retry: false });
  const imported = trpc.diabetes.patientsPage.useQuery({ query, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }, { retry: false });
  const summary = trpc.diabetes.summary.useQuery(undefined, { retry: false });
  const activeQuery = view === "registered" ? registered : imported;
  const total = view === "registered" ? registered.data?.total ?? 0 : imported.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loading = activeQuery.isLoading;
  const error = activeQuery.error;

  function changeView(next: ViewKind) {
    setView(next);
    setPage(1);
    setQuery("");
  }

  function refresh() {
    void registered.refetch();
    void imported.refetch();
    void summary.refetch();
  }

  return (
    <DashboardLayout>
      <div className="replica-page">
        <header className="replica-page-heading">
          <div>
            <span className="replica-eyebrow"><span /> {language === "th" ? "พื้นที่ดูแลผู้ป่วย" : "CARE WORKSPACE"}</span>
            <h1>{language === "th" ? "ระเบียนผู้ป่วย" : "Patient records"}</h1>
            <p>{language === "th" ? "ค้นหาและเปิดข้อมูลจากแหล่งที่มาจริง โดยแยกระเบียนผู้ป่วยคลินิกออกจากกลุ่มนำเข้า" : "Search and open real source records. Registered clinical patients stay separate from the imported cohort."}</p>
          </div>
          <div className="replica-heading-actions">
            <button type="button" onClick={refresh} className="replica-secondary-button" aria-label={t("refresh")}><RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" /> {t("refresh")}</button>
            <Link href="/patients/new" className="replica-primary-button"><Users aria-hidden="true" /> {t("registerPatient")}</Link>
          </div>
        </header>

        <section className="replica-metric-grid" aria-label={language === "th" ? "สรุประเบียน" : "Record summary"}>
          <Metric icon={Users} label={language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients"} value={registered.data?.total ?? "—"} helper={language === "th" ? "ระเบียนคลินิกที่ยังใช้งาน" : "Active clinical records"} tone="blue" />
          <Metric icon={Database} label={language === "th" ? "กลุ่มนำเข้า" : "Imported cohort"} value={summary.data?.patientCount ?? "—"} helper={summary.data?.batch ? summary.data.batch.sourceFilename : language === "th" ? "ยังไม่มีชุดนำเข้า" : "No imported batch"} tone="cyan" />
          <Metric icon={ClipboardList} label={language === "th" ? "การสังเกต" : "Observations"} value={summary.data ? formatNumber(summary.data.observationCount, language) : "—"} helper={language === "th" ? "ค่าจากแหล่งข้อมูลเดิม" : "Source-preserved values"} tone="green" />
          <Metric icon={CheckCircle2} label={language === "th" ? "กำลังดู" : "Current view"} value={total} helper={view === "registered" ? (language === "th" ? "ระเบียนคลินิก" : "Clinical records") : (language === "th" ? "ระเบียนนำเข้า" : "Imported records")} tone="rose" />
        </section>

        <section className="replica-panel">
          <div className="replica-panel-heading patients-panel-heading">
            <div><span className="replica-eyebrow">{language === "th" ? "ค้นหาข้อมูลจริง" : "CONNECTED RECORDS"}</span><h2>{language === "th" ? "ผู้ป่วยและแหล่งข้อมูล" : "Patients and source records"}</h2></div>
            <div className="patients-view-toggle" role="tablist" aria-label={language === "th" ? "ประเภทระเบียน" : "Record type"}>
              <button type="button" role="tab" aria-selected={view === "registered"} className={view === "registered" ? "is-active" : ""} onClick={() => changeView("registered")}>{language === "th" ? "ผู้ป่วยคลินิก" : "Registered"}</button>
              <button type="button" role="tab" aria-selected={view === "imported"} className={view === "imported" ? "is-active" : ""} onClick={() => changeView("imported")}>{language === "th" ? "ข้อมูลนำเข้า" : "Imported"}</button>
            </div>
          </div>
          <div className="patients-toolbar">
            <div className="patients-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={language === "th" ? "ค้นหาด้วยรหัส ชื่อ สถานที่ หรือแหล่งข้อมูล" : "Search code, name, location, or source field"} aria-label={language === "th" ? "ค้นหาระเบียน" : "Search records"} /></div>
            <span className="patients-total">{formatNumber(total, language)} {language === "th" ? "ระเบียน" : "records"}</span>
          </div>

          {loading && <div className="replica-loading-rows"><span /><span /><span /></div>}
          {!loading && error && <div className="replica-empty-state is-error"><AlertTriangle aria-hidden="true" /><strong>{language === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Records could not be loaded"}</strong><p>{language === "th" ? "ระบบจะแสดงข้อผิดพลาดแทนการเติมข้อมูลตัวอย่าง" : "The app shows the failure instead of filling the view with sample records."}</p><button type="button" className="replica-text-button" onClick={refresh}>{t("tryAgain")} <ArrowRight aria-hidden="true" /></button></div>}
          {!loading && !error && total === 0 && <div className="replica-empty-state"><Search aria-hidden="true" /><strong>{query ? (language === "th" ? "ไม่พบระเบียนที่ตรงกัน" : "No matching records") : (view === "registered" ? (language === "th" ? "ยังไม่มีผู้ป่วยที่ลงทะเบียน" : "No registered patients yet") : (language === "th" ? "ยังไม่มีข้อมูลนำเข้า" : "No imported records yet"))}</strong><p>{query ? (language === "th" ? "ลองใช้คำค้นอื่น" : "Try a different search term.") : (language === "th" ? "ข้อมูลที่บันทึกจากระบบเชื่อมต่อจะแสดงที่นี่" : "Records from the connected backend will appear here.")}</p></div>}
          {!loading && !error && total > 0 && <div className="replica-record-list">
            {view === "registered" && registered.data?.patients.map((patient) => <Link key={`registered-${patient.id}`} href={`/patients/registered/${patient.id}`} className="replica-record-row"><span className="replica-avatar"><Users aria-hidden="true" /></span><span className="replica-record-main"><strong>{patient.displayName || patient.patientCode}</strong><small>{patient.patientCode} · {patient.registrationLocation} · {patient.observationCount} {language === "th" ? "การสังเกต" : "observations"}</small></span><span className="patients-status-pill is-registered">{language === "th" ? "คลินิก" : "Clinical"}</span><span className="replica-record-time">{formatDate(patient.createdAt, language)}</span><ArrowRight aria-hidden="true" /></Link>)}
            {view === "imported" && imported.data?.patients.map((patient) => <Link key={`imported-${patient.id}`} href={`/patients/${patient.id}`} className="replica-record-row"><span className="replica-avatar is-cyan"><FileText aria-hidden="true" /></span><span className="replica-record-main"><strong>{language === "th" ? `ระเบียนนำเข้า #${patient.sourceRowNumber}` : `Imported record #${patient.sourceRowNumber}`}</strong><small>{patient.age} · {patient.sex} · {patient.identifyBy} · {patient.observationCount} {language === "th" ? "การสังเกต" : "observations"}</small></span><span className="patients-status-pill is-imported">{language === "th" ? "ต้นทาง" : "Source"}</span><span className="replica-record-time">{formatDate(patient.createdAt, language)}</span><ArrowRight aria-hidden="true" /></Link>)}
          </div>}

          {!loading && !error && total > 0 && <div className="patients-pagination"><span>{language === "th" ? `หน้า ${page} จาก ${pageCount}` : `Page ${page} of ${pageCount}`}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{language === "th" ? "ก่อนหน้า" : "Previous"}</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{language === "th" ? "ถัดไป" : "Next"}</button></div></div>}
        </section>

        <section className="replica-panel replica-safety-banner"><ShieldAlert aria-hidden="true" /><div><strong>{t("decisionSupport")}</strong><p>{language === "th" ? "ข้อมูลนำเข้าเป็นค่าที่เก็บรักษาจากต้นทาง ไม่ใช่การยืนยันตัวตนหรือการวินิจฉัยผู้ป่วย" : "Imported values preserve source provenance. They don't identify or diagnose a clinical patient."}</p></div></section>
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon: Icon, label, value, helper, tone }: { icon: typeof Users; label: string; value: string | number; helper: string; tone: "blue" | "cyan" | "green" | "rose" }) {
  return <div className="replica-metric-card"><div className={`replica-metric-icon tone-${tone}`}><Icon aria-hidden="true" /></div><div className="min-w-0"><p>{label}</p><strong>{value}</strong><span>{helper}</span></div><ArrowRight className="replica-metric-arrow" aria-hidden="true" /></div>;
}
