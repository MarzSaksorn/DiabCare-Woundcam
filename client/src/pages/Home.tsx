import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/locale";
import { trpc } from "@/lib/trpc";
import { isPublicDemoMode } from "@/lib/public-demo";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  ImageIcon,
  ShieldCheck,
  Timer,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import "@/styles/home-redesign.css";

type MetricTone = "primary" | "cyan" | "amber" | "green";

type MetricCardProps = {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
  unavailable?: boolean;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
  unavailable = false,
}: MetricCardProps) {
  return (
    <article className={`home-stitch-metric is-${tone}`}>
      <div className="home-stitch-metric-heading">
        <span>{label}</span>
        <Icon aria-hidden="true" />
      </div>
      <div className="home-stitch-metric-value">
        <strong className={unavailable ? "is-unavailable" : undefined}>
          {value}
        </strong>
      </div>
      <p>{helper}</p>
    </article>
  );
}

function LoadingRows({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`home-stitch-loading ${compact ? "is-compact" : ""}`}
      aria-label="Loading"
    >
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof Users;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="home-stitch-empty">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  );
}

function UnavailableState({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="home-stitch-empty is-error" role="alert">
      <TriangleAlert aria-hidden="true" />
      <strong>{message}</strong>
      <p>{detail}</p>
    </div>
  );
}

export default function Home() {
  const { language, t } = useLanguage();
  const dashboard = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const imported = trpc.diabetes.summary.useQuery(undefined, { retry: false });
  const summary = dashboard.data;
  const unavailable =
    language === "th" ? "ยังไม่ได้เชื่อมต่อฐานข้อมูล" : "Database not connected";
  const unavailableDetail =
    language === "th"
      ? "ตรวจสอบการตั้งค่า Supabase PostgreSQL ของเซิร์ฟเวอร์"
      : "Check the server Supabase PostgreSQL configuration.";
  const noAppointments =
    language === "th"
      ? "ยังไม่มีแหล่งข้อมูลนัดหมายที่เชื่อมต่อ"
      : "Appointment data is not connected";
  const noTrend =
    language === "th"
      ? "ยังไม่มีข้อมูลการวัดแผลตามช่วงเวลา"
      : "No longitudinal wound measurements are connected";
  const dateLabel = new Intl.DateTimeFormat(
    language === "th" ? "th-TH" : "en-US",
    { dateStyle: "medium" }
  ).format(new Date());
  const recentPhotos = summary?.recentPhotos ?? [];

  return (
    <DashboardLayout>
      <main className="home-stitch" aria-labelledby="home-stitch-title">
        <header className="home-stitch-welcome">
          <div className="home-stitch-welcome-copy">
            <div className="home-stitch-eyebrow">
              <span aria-hidden="true" />
              {language === "th"
                ? "ระบบติดตามแผลเบาหวานแบบเรียลไทม์ (Clinical OS)"
                : "DIABETIC WOUND CARE OPERATIONS"}
              <span className="home-stitch-eyebrow-divider" aria-hidden="true">
                |
              </span>
              <span className="home-stitch-eyebrow-muted">
                {language === "th" ? "ศูนย์ดูแลแผล" : "CLINICAL WORKSPACE"}
              </span>
            </div>
            <h1 id="home-stitch-title">
              {language === "th" ? (
                <>
                  ยินดีต้อนรับสู่ศูนย์ดูแลแผลเบาหวาน
                  <span>(DiabCare WoundCam)</span>
                </>
              ) : (
                <>
                  Welcome to the diabetic wound care center
                  <span>(DiabCare WoundCam)</span>
                </>
              )}
            </h1>
            <p className="home-stitch-date">
              <CalendarDays aria-hidden="true" />
              {dateLabel}
              <span aria-hidden="true">•</span>
              {isPublicDemoMode
                ? language === "th" ? "ข้อมูลสังเคราะห์สำหรับโหมดสาธิต" : "Synthetic public-demo data"
                : language === "th"
                ? "ข้อมูลจริงจากระเบียนที่เชื่อมต่อ"
                : "Live data from connected clinical records"}
            </p>
          </div>
          <div className="home-stitch-welcome-actions">
            <Link href="/camera" className="home-stitch-button is-primary">
              <Camera aria-hidden="true" />
              {language === "th" ? "ถ่ายภาพแผลใหม่" : "Capture new wound"}
            </Link>
            {!isPublicDemoMode && <Link href="/patients/new" className="home-stitch-button is-secondary">
              <UserPlus aria-hidden="true" />
              {language === "th" ? "ลงทะเบียนผู้ป่วยใหม่" : "Register patient"}
            </Link>}
            <Link
              href="/reports"
              className="home-stitch-button is-tertiary"
              aria-label={
                language === "th" ? "เปิดรายงาน" : "Open reports"
              }
            >
              <FileText aria-hidden="true" />
              <span>{language === "th" ? "รายงาน" : "Reports"}</span>
            </Link>
          </div>
        </header>

        <section
          className="home-stitch-metrics"
          aria-label={language === "th" ? "ตัวชี้วัดหลัก" : "Key metrics"}
        >
          <MetricCard
            icon={Users}
            tone="primary"
            label={language === "th" ? "ผู้ป่วยทั้งหมดในระบบ" : "Registered patients"}
            value={summary ? formatNumber(summary.registeredPatientCount, language) : "—"}
            helper={
              summary
                ? language === "th"
                  ? "ระเบียนที่ยังใช้งาน"
                  : "Active clinical records"
                : unavailable
            }
            unavailable={!summary}
          />
          <MetricCard
            icon={ClipboardList}
            tone="cyan"
            label={language === "th" ? "การประเมินแผล" : "Wound assessments"}
            value={summary ? formatNumber(summary.woundAssessmentCount, language) : "—"}
            helper={
              summary
                ? language === "th"
                  ? "รายการที่บันทึกจริง"
                  : "Persisted assessments"
                : unavailable
            }
            unavailable={!summary}
          />
          <MetricCard
            icon={ImageIcon}
            tone="green"
            label={language === "th" ? "รูปแผลที่มองเห็น" : "Visible wound photos"}
            value={summary ? formatNumber(summary.visiblePhotoCount, language) : "—"}
            helper={
              summary
                ? language === "th"
                  ? "ไม่รวมสื่อที่ซ่อน"
                  : "Hidden media excluded"
                : unavailable
            }
            unavailable={!summary}
          />
          <MetricCard
            icon={CalendarDays}
            tone="amber"
            label={language === "th" ? "นัดหมายตรวจวันนี้" : "Appointments today"}
            value="—"
            helper={noAppointments}
            unavailable
          />
        </section>

        <section className="home-stitch-focus-grid" aria-label={language === "th" ? "จุดติดตามหลัก" : "Clinical focus"}>
          <article className="home-stitch-card home-stitch-queue-card is-full-width">
            <div className="home-stitch-card-heading">
              <div>
                <span className="home-stitch-section-kicker">
                  {language === "th" ? "คิวนัดหมายถัดไป" : "NEXT QUEUE"}
                </span>
                <h2>{language === "th" ? "นัดตรวจอาการ" : "Appointments"}</h2>
              </div>
              <Timer aria-hidden="true" />
            </div>
            <EmptyState
              icon={Clock3}
              title={noAppointments}
              detail={
                language === "th"
                  ? "จะแสดงคิวเมื่อมีแหล่งข้อมูลนัดหมายที่ได้รับการเชื่อมต่อ"
                  : "The next queue will appear when an approved appointment source is connected."
              }
              action={
                <Link href="/camera" className="home-stitch-empty-link">
                  <Camera aria-hidden="true" />
                  {language === "th" ? "เตรียมถ่ายภาพแผล" : "Prepare a wound capture"}
                </Link>
              }
            />
          </article>
        </section>

        <section className="home-stitch-lower-grid">
          <article className="home-stitch-card home-stitch-trend-card">
            <div className="home-stitch-card-heading is-stackable">
              <div>
                <span className="home-stitch-section-kicker">
                  {language === "th" ? "แนวโน้มการสมานแผล" : "HEALING TREND"}
                </span>
                <h2>
                  {language === "th"
                    ? "แนวโน้มการหายของแผลภาพรวม"
                    : "Overall wound healing trend"}
                </h2>
                <p>
                  {language === "th"
                    ? "ต้องมีการประเมินแผลที่เชื่อมโยงกับช่วงเวลาอย่างน้อยสองรายการ"
                    : "Two or more dated assessments are required before a trend can be shown."}
                </p>
              </div>
              <div className="home-stitch-periods" role="group" aria-label={language === "th" ? "ช่วงเวลา" : "Time range"}>
                <button type="button" disabled>{language === "th" ? "30 วัน" : "30 days"}</button>
                <button type="button" className="is-active" disabled>{language === "th" ? "3 เดือน" : "3 months"}</button>
                <button type="button" disabled>{language === "th" ? "1 ปี" : "1 year"}</button>
              </div>
            </div>
            <div className="home-stitch-trend-empty">
              <HeartPulse aria-hidden="true" />
              <strong>{noTrend}</strong>
              <p>
                {language === "th"
                  ? "ยังไม่มีการคำนวณแนวโน้มจากข้อมูลทางคลินิกที่เชื่อมต่อ"
                  : "No trend is calculated from the currently connected clinical data."}
              </p>
            </div>
          </article>

          <article className="home-stitch-card home-stitch-schedule-card">
            <div className="home-stitch-card-heading">
              <div>
                <span className="home-stitch-section-kicker">
                  {language === "th" ? "ตารางนัดหมายผู้ป่วย" : "PATIENT SCHEDULE"}
                </span>
                <h2>{language === "th" ? "ตารางวันนี้" : "Today’s schedule"}</h2>
              </div>
              <CalendarDays aria-hidden="true" />
            </div>
            <div className="home-stitch-schedule-empty">
              <ClipboardList aria-hidden="true" />
              <strong>{noAppointments}</strong>
              <p>
                {language === "th"
                  ? "ระบบจะแสดงนัดเมื่อมีแหล่งข้อมูลที่ได้รับการอนุมัติ"
                  : "Scheduled visits will appear when an approved source is connected."}
              </p>
            </div>
          </article>
        </section>

        <section className="home-stitch-card home-stitch-captures-card">
          <div className="home-stitch-card-heading">
            <div>
              <span className="home-stitch-section-kicker">
                {language === "th" ? "การถ่ายภาพล่าสุด" : "LATEST CAPTURES"}
              </span>
              <h2>{language === "th" ? "ประวัติรูปแผล" : "Wound-photo history"}</h2>
            </div>
            <Link href="/camera#capture-history" className="home-stitch-inline-link">
              {language === "th" ? "เปิดประวัติ" : "Open history"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {dashboard.isLoading && <LoadingRows compact />}
          {dashboard.isError && (
            <UnavailableState message={unavailable} detail={unavailableDetail} />
          )}
          {!dashboard.isLoading && !dashboard.isError && recentPhotos.length === 0 && (
            <EmptyState
              icon={ImageIcon}
              title={language === "th" ? "ยังไม่มีรูปภาพ" : "No wound photos"}
              detail={
                language === "th"
                  ? "รูปที่บันทึกกับผู้ป่วยจะแสดงในประวัติรูปแผล"
                  : "Photos saved to a patient record will appear in wound-photo history."
              }
              action={
                <Link href="/camera" className="home-stitch-empty-link">
                  <Camera aria-hidden="true" />
                  {language === "th" ? "เปิดกล้อง" : "Open camera"}
                </Link>
              }
            />
          )}
          {!dashboard.isLoading && !dashboard.isError && recentPhotos.length > 0 && (
            <div className="home-stitch-capture-list">
              {recentPhotos.map(photo => (
                <Link
                  key={photo.id}
                  href={`/patients/registered/${photo.patientId}`}
                  className="home-stitch-capture-row"
                >
                  <span className="home-stitch-capture-icon">
                    <ImageIcon aria-hidden="true" />
                  </span>
                  <span className="home-stitch-capture-copy">
                    <strong>{photo.displayName || photo.patientCode}</strong>
                    <small>{photo.fileName}</small>
                  </span>
                  <time dateTime={(photo.capturedAt || photo.createdAt).toISOString()}>
                    {formatDate(photo.capturedAt || photo.createdAt, language)}
                  </time>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="home-stitch-safety" aria-label={language === "th" ? "ความปลอดภัยทางคลินิก" : "Clinical safety note"}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>{t("decisionSupport")}</strong>
            <p>
              {language === "th"
                ? "ผลจากโมเดลเป็นข้อมูลช่วยทบทวนเท่านั้น ผู้เชี่ยวชาญต้องตรวจสอบก่อนตัดสินใจดูแล"
                : "Model output supports review only. A qualified clinician must verify it before any care decision."}
            </p>
          </div>
        </section>
        {imported.data?.batch && (
          <p className="home-stitch-source-note">
            {language === "th" ? "ข้อมูลกลุ่มนำเข้า" : "Imported cohort"}: {formatNumber(imported.data.patientCount, language)} {language === "th" ? "ระเบียน · แสดงแยกจากผู้ป่วยที่ลงทะเบียน" : "records · kept separate from registered clinical patients"}.
          </p>
        )}
      </main>
    </DashboardLayout>
  );
}
