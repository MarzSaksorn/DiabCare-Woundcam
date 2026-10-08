import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, ArrowRight, CalendarDays, Camera, ClipboardList, HeartPulse, ImageIcon, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";

function MetricCard({ icon: Icon, label, value, helper, tone }: { icon: typeof Users; label: string; value: string; helper: string; tone: "blue" | "cyan" | "green" | "rose" }) {
  return (
    <div className="replica-metric-card">
      <div className={`replica-metric-icon tone-${tone}`}><Icon aria-hidden="true" /></div>
      <div className="min-w-0">
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
      <ArrowRight className="replica-metric-arrow" aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  const { language, t } = useLanguage();
  const dashboard = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const imported = trpc.diabetes.summary.useQuery(undefined, { retry: false });
  const summary = dashboard.data;
  const unavailable = language === "th" ? "ยังไม่ได้เชื่อมต่อฐานข้อมูล" : "Database not connected";
  const notConnected = language === "th" ? "ยังไม่มีข้อมูลนัดหมายที่เชื่อมต่อ" : "Appointment data is not connected";
  const dateLabel = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(new Date());

  return (
    <DashboardLayout>
      <div className="replica-page">
        <header className="replica-page-heading">
          <div>
            <span className="replica-eyebrow"><span /> {language === "th" ? "พื้นที่ดูแลผู้ป่วย" : "CARE WORKSPACE"}</span>
            <h1>{language === "th" ? "ชุด EMR ติดตามแผลเบาหวาน" : "Diabetic wound care workspace"}</h1>
            <p>{language === "th" ? "ติดตามระเบียนผู้ป่วย รูปภาพแผล และผลช่วยประเมินจากระบบภายใน" : "Review registered patients, wound media, and server-side clinical decision support."}</p>
          </div>
          <div className="replica-heading-actions">
            <span className="replica-date"><CalendarDays aria-hidden="true" /> {dateLabel}</span>
            <Link href="/camera" className="replica-primary-button"><Camera aria-hidden="true" /> {language === "th" ? "ถ่ายภาพแผล" : "Capture wound"}</Link>
          </div>
        </header>

        <section className="replica-hero-card" aria-labelledby="hero-title">
          <div>
            <span className="replica-hero-badge">{language === "th" ? "ระบบ EMR หลัก" : "PRIMARY EMR"}</span>
            <h2 id="hero-title">{language === "th" ? "ดูแลต่อเนื่องด้วยข้อมูลที่ตรวจสอบได้" : "Keep every wound review grounded in the record."}</h2>
            <p>{language === "th" ? "ข้อมูลผู้ป่วยและการวิเคราะห์ภาพยังคงอยู่ในขอบเขตเซิร์ฟเวอร์ที่กำหนด" : "Patient records and model-assisted image review stay within the configured server boundary."}</p>
          </div>
          <div className="replica-hero-art" aria-hidden="true"><Camera /><Activity /></div>
        </section>

        <section className="replica-metric-grid" aria-label={language === "th" ? "สรุปข้อมูลจริง" : "Connected data summary"}>
          <MetricCard icon={Users} label={language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients"} value={summary ? formatNumber(summary.registeredPatientCount, language) : "—"} helper={summary ? (language === "th" ? "ระเบียนที่ยังใช้งาน" : "Active clinical records") : unavailable} tone="blue" />
          <MetricCard icon={ClipboardList} label={language === "th" ? "การประเมินแผล" : "Wound assessments"} value={summary ? formatNumber(summary.woundAssessmentCount, language) : "—"} helper={summary ? (language === "th" ? "รายการที่บันทึกจริง" : "Persisted assessments") : unavailable} tone="cyan" />
          <MetricCard icon={ImageIcon} label={language === "th" ? "รูปแผลที่มองเห็น" : "Visible wound photos"} value={summary ? formatNumber(summary.visiblePhotoCount, language) : "—"} helper={summary ? (language === "th" ? "ไม่รวมสื่อที่ซ่อน" : "Hidden media excluded") : unavailable} tone="green" />
          <MetricCard icon={CalendarDays} label={language === "th" ? "นัดหมายวันนี้" : "Scheduled today"} value="—" helper={notConnected} tone="rose" />
        </section>

        <div className="replica-dashboard-grid">
          <section className="replica-panel replica-panel-large">
            <div className="replica-panel-heading"><div><span className="replica-eyebrow">{language === "th" ? "ระเบียนล่าสุด" : "RECENT RECORDS"}</span><h2>{language === "th" ? "ผู้ป่วยที่อัปเดตล่าสุด" : "Recently updated patients"}</h2></div><Link href="/patients" className="replica-text-button">{language === "th" ? "ดูทั้งหมด" : "View all"} <ArrowRight aria-hidden="true" /></Link></div>
            {dashboard.isLoading && <LoadingRows />}
            {dashboard.isError && <UnavailableState message={unavailable} detail={language === "th" ? "ตรวจสอบการตั้งค่า Supabase PostgreSQL ของเซิร์ฟเวอร์" : "Check the server Supabase PostgreSQL configuration."} />}
            {!dashboard.isLoading && !dashboard.isError && summary?.recentPatients.length === 0 && <EmptyState icon={Users} title={language === "th" ? "ยังไม่มีระเบียนผู้ป่วย" : "No registered patients yet"} detail={language === "th" ? "ระเบียนที่สร้างผ่านระบบจะปรากฏที่นี่" : "Records created through the connected app will appear here."} />}
            {!dashboard.isLoading && !dashboard.isError && (summary?.recentPatients.length ?? 0) > 0 && <div className="replica-record-list">{summary?.recentPatients.map((patient) => <Link className="replica-record-row" key={patient.id} href={`/patients/registered/${patient.id}`}><span className="replica-avatar"><Users aria-hidden="true" /></span><span className="replica-record-main"><strong>{patient.displayName || patient.patientCode}</strong><small>{patient.patientCode} · {patient.registrationLocation}</small></span><span className="replica-record-time">{formatDate(patient.updatedAt, language)}</span><ArrowRight aria-hidden="true" /></Link>)}</div>}
          </section>

          <aside className="replica-side-stack">
            <section className="replica-panel">
              <div className="replica-panel-heading"><div><span className="replica-eyebrow">{language === "th" ? "การถ่ายภาพล่าสุด" : "LATEST CAPTURES"}</span><h2>{language === "th" ? "ประวัติรูปแผล" : "Wound-photo history"}</h2></div><ImageIcon className="replica-panel-icon" aria-hidden="true" /></div>
              {dashboard.isLoading && <LoadingRows compact />}
              {!dashboard.isLoading && !dashboard.isError && (summary?.recentPhotos.length ?? 0) === 0 && <EmptyState icon={ImageIcon} title={language === "th" ? "ยังไม่มีรูปภาพ" : "No wound photos"} detail={language === "th" ? "รูปที่บันทึกกับผู้ป่วยจะแสดงที่นี่" : "Photos saved to a patient record will appear here."} />}
              {!dashboard.isLoading && !dashboard.isError && (summary?.recentPhotos.length ?? 0) > 0 && <div className="replica-capture-list">{summary?.recentPhotos.map((photo) => <div className="replica-capture-row" key={photo.id}><span className="replica-capture-icon"><ImageIcon aria-hidden="true" /></span><div><strong>{photo.displayName || photo.patientCode}</strong><small>{photo.fileName}</small></div><time>{photo.capturedAt ? formatDate(photo.capturedAt, language) : "—"}</time></div>)}</div>}
            </section>

            <section className="replica-panel replica-unavailable-panel"><div className="replica-unavailable-icon"><HeartPulse aria-hidden="true" /></div><div><h2>{language === "th" ? "แนวโน้มการหายของแผล" : "Healing trend"}</h2><p>{language === "th" ? "ยังไม่แสดงผลจนกว่าจะมีข้อมูลการวัดที่ตรวจสอบแล้ว" : "Not shown until validated longitudinal measurements are available."}</p><span>{language === "th" ? "ไม่มีแหล่งข้อมูลที่เชื่อมต่อ" : "No connected source"}</span></div></section>
          </aside>
        </div>

        <section className="replica-panel replica-safety-banner"><ShieldCheck aria-hidden="true" /><div><strong>{t("decisionSupport")}</strong><p>{language === "th" ? "ผลจากโมเดลเป็นข้อมูลช่วยทบทวนเท่านั้น ผู้เชี่ยวชาญต้องตรวจสอบก่อนตัดสินใจดูแล" : "Model output supports review only. A qualified clinician must verify it before any care decision."}</p></div></section>
        {imported.data?.batch && <p className="replica-source-note">{language === "th" ? "ข้อมูลกลุ่มนำเข้า" : "Imported cohort"}: {formatNumber(imported.data.patientCount, language)} {language === "th" ? "ระเบียน · แสดงแยกจากผู้ป่วยที่ลงทะเบียน" : "records · kept separate from registered clinical patients"}.</p>}
      </div>
    </DashboardLayout>
  );
}

function LoadingRows({ compact = false }: { compact?: boolean }) {
  return <div className={`replica-loading-rows ${compact ? "is-compact" : ""}`} aria-label="Loading"><span /><span /><span /></div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Users; title: string; detail: string }) {
  return <div className="replica-empty-state"><Icon aria-hidden="true" /><strong>{title}</strong><p>{detail}</p></div>;
}

function UnavailableState({ message, detail }: { message: string; detail: string }) {
  return <div className="replica-empty-state is-error"><Activity aria-hidden="true" /><strong>{message}</strong><p>{detail}</p></div>;
}
