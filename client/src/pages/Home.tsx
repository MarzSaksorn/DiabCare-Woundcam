import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/locale";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";
import { Link } from "wouter";
import "@/styles/home-redesign.css";

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  unavailable?: boolean;
};

function MetricCard({ label, value, helper, unavailable = false }: MetricCardProps) {
  return (
    <article className="home-stitch-metric">
      <span className="home-stitch-metric-label">{label}</span>
      <strong className={unavailable ? "is-unavailable" : undefined}>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div
      className="home-stitch-loading"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof ImageIcon;
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
  const loadingSummary =
    language === "th" ? "กำลังโหลดข้อมูลสรุป" : "Loading dashboard data";
  const loadingHistory =
    language === "th" ? "กำลังโหลดประวัติรูปแผล" : "Loading wound-photo history";
  const noAppointments =
    language === "th"
      ? "ยังไม่มีแหล่งข้อมูลนัดหมายที่เชื่อมต่อ"
      : "Appointment data is not connected";
  const noTrend =
    language === "th"
      ? "ยังไม่มีข้อมูลการวัดแผลตามช่วงเวลา"
      : "No longitudinal wound measurements are connected";
  const recentPhotos = summary?.recentPhotos ?? [];
  const metricHelper = (available: string) =>
    summary ? available : dashboard.isLoading ? loadingSummary : unavailable;

  return (
    <DashboardLayout>
      <main className="home-stitch" aria-labelledby="home-stitch-title">
        <header className="home-stitch-welcome">
          <div className="home-stitch-welcome-copy">
            <span className="home-stitch-eyebrow">
              {language === "th" ? "พื้นที่ทำงานทางคลินิก" : "Clinical workspace"}
            </span>
            <h1 id="home-stitch-title">
              {language === "th" ? "ภาพรวมทางคลินิก" : "Clinical overview"}
            </h1>
            <p className="home-stitch-description">
              {language === "th"
                ? "ตรวจดูผู้ป่วยที่ลงทะเบียน การประเมินแผล และภาพแผลที่บันทึกไว้"
                : "Review registered patients, wound assessments, and saved wound photos."}
            </p>
          </div>
          <div className="home-stitch-welcome-actions">
            <Link href="/camera" className="home-stitch-button is-primary">
              <Camera aria-hidden="true" />
              {language === "th" ? "ถ่ายภาพแผลใหม่" : "Capture new wound"}
            </Link>
            <Link href="/patients/new" className="home-stitch-button is-secondary">
              <UserPlus aria-hidden="true" />
              {language === "th" ? "ลงทะเบียนผู้ป่วย" : "Register patient"}
            </Link>
            <Link
              href="/reports"
              className="home-stitch-report-link"
              aria-label={language === "th" ? "เปิดรายงาน" : "Open reports"}
            >
              <FileText aria-hidden="true" />
              {language === "th" ? "รายงาน" : "Reports"}
            </Link>
          </div>
        </header>

        <section className="home-stitch-metrics" aria-labelledby="home-stitch-metrics-title">
          <div className="home-stitch-section-heading">
            <h2 id="home-stitch-metrics-title">
              {language === "th" ? "ตัวชี้วัดหลัก" : "Key metrics"}
            </h2>
          </div>
          <div className="home-stitch-metric-grid">
            <MetricCard
              label={language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients"}
              value={summary ? formatNumber(summary.registeredPatientCount, language) : "—"}
              helper={metricHelper(
                language === "th" ? "ระเบียนทางคลินิกที่ใช้งาน" : "Active clinical records"
              )}
              unavailable={!summary}
            />
            <MetricCard
              label={language === "th" ? "การประเมินแผล" : "Wound assessments"}
              value={summary ? formatNumber(summary.woundAssessmentCount, language) : "—"}
              helper={metricHelper(
                language === "th" ? "รายการที่บันทึกแล้ว" : "Persisted assessments"
              )}
              unavailable={!summary}
            />
            <MetricCard
              label={language === "th" ? "ภาพแผลที่มองเห็น" : "Visible wound photos"}
              value={summary ? formatNumber(summary.visiblePhotoCount, language) : "—"}
              helper={metricHelper(
                language === "th" ? "ไม่รวมสื่อที่ซ่อน" : "Hidden media excluded"
              )}
              unavailable={!summary}
            />
            <MetricCard
              label={language === "th" ? "นัดหมายวันนี้" : "Appointments today"}
              value="—"
              helper={noAppointments}
              unavailable
            />
          </div>
        </section>

        <section
          className="home-stitch-focus-grid"
          aria-label={language === "th" ? "จุดติดตามหลัก" : "Clinical focus"}
        >
          <article className="home-stitch-card home-stitch-queue-card is-full-width">
            <div className="home-stitch-card-heading">
              <div>
                <span className="home-stitch-section-kicker">
                  {language === "th" ? "คิวนัดหมายถัดไป" : "Next queue"}
                </span>
                <h2>{language === "th" ? "นัดหมาย" : "Appointments"}</h2>
              </div>
              <Timer aria-hidden="true" />
            </div>
            <EmptyState
              icon={Clock3}
              title={noAppointments}
              detail={
                language === "th"
                  ? "คิวถัดไปจะแสดงเมื่อมีแหล่งข้อมูลนัดหมายที่ได้รับอนุมัติเชื่อมต่อ"
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

        <section
          className="home-stitch-lower-grid"
          aria-label={language === "th" ? "แนวโน้มและตารางนัดหมาย" : "Wound trend and schedule"}
        >
          <article className="home-stitch-card home-stitch-trend-card">
            <div className="home-stitch-card-heading is-stackable">
              <div>
                <span className="home-stitch-section-kicker">
                  {language === "th" ? "แนวโน้มการสมานแผล" : "Healing trend"}
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
              <div
                className="home-stitch-periods"
                role="group"
                aria-label={language === "th" ? "ช่วงเวลา" : "Time range"}
              >
                <button type="button" disabled>{language === "th" ? "30 วัน" : "30 days"}</button>
                <button type="button" className="is-active" disabled aria-pressed="true">
                  {language === "th" ? "3 เดือน" : "3 months"}
                </button>
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
                  {language === "th" ? "ตารางผู้ป่วย" : "Patient schedule"}
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
                  ? "กำหนดการเข้าพบจะแสดงเมื่อมีแหล่งข้อมูลที่ได้รับอนุมัติเชื่อมต่อ"
                  : "Scheduled visits will appear when an approved source is connected."}
              </p>
            </div>
          </article>
        </section>

        <section className="home-stitch-card home-stitch-captures-card" aria-labelledby="home-stitch-captures-title">
          <div className="home-stitch-card-heading">
            <div>
              <h2 id="home-stitch-captures-title">
                {language === "th" ? "ประวัติรูปแผล" : "Wound-photo history"}
              </h2>
              <p>{language === "th" ? "ภาพที่บันทึกล่าสุด" : "Latest captures"}</p>
            </div>
            <Link href="/camera#capture-history" className="home-stitch-inline-link">
              {language === "th" ? "เปิดประวัติ" : "Open history"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {dashboard.isLoading && <LoadingRows label={loadingHistory} />}
          {dashboard.isError && (
            <UnavailableState message={unavailable} detail={unavailableDetail} />
          )}
          {!dashboard.isLoading && !dashboard.isError && recentPhotos.length === 0 && (
            <EmptyState
              icon={ImageIcon}
              title={language === "th" ? "ยังไม่มีรูปภาพ" : "No wound photos"}
              detail={
                language === "th"
                  ? "รูปที่บันทึกไว้ในระเบียนผู้ป่วยจะแสดงในประวัติรูปแผล"
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

        <section
          className="home-stitch-safety"
          aria-label={language === "th" ? "ความปลอดภัยทางคลินิก" : "Clinical safety note"}
        >
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
