import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, CheckCircle2, Database, Download, Globe2, KeyRound, LogOut, RefreshCw, ServerCog, ShieldCheck, TriangleAlert, UserRound, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const [healthTimestamp] = useState(() => Date.now());
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const health = trpc.system.health.useQuery({ timestamp: healthTimestamp }, { retry: false });
  const summary = trpc.dashboard.summary.useQuery(undefined, { retry: false });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => window.location.reload() });
  const databaseReady = health.data?.dependencies.database === true;
  const modelReady = health.data?.dependencies.model.available === true;
  const classifierReady = health.data?.dependencies.classifier.available === true && health.data?.dependencies.classifier.enabled === true;
  const storageReady = health.data?.dependencies.storage === true;

  const statusExport = useMemo(() => ({
    application: "DiabCare WoundCam",
    exportedAt: new Date().toISOString(),
    language,
    database: databaseReady ? "ready" : "unavailable",
    model: modelReady ? health.data?.dependencies.model.model : "unavailable",
    classifier: classifierReady ? health.data?.dependencies.classifier.model : health.data?.dependencies.classifier.enabled === false ? "disabled" : "unavailable",
    storage: storageReady ? "ready" : "unavailable",
    registeredPatientCount: summary.data?.registeredPatientCount ?? null,
    woundAssessmentCount: summary.data?.woundAssessmentCount ?? null,
    note: "Runtime status only. Patient records and private credentials are not included.",
  }), [classifierReady, databaseReady, health.data?.dependencies.classifier.enabled, health.data?.dependencies.classifier.model, health.data?.dependencies.model.model, language, modelReady, storageReady, summary.data?.registeredPatientCount, summary.data?.woundAssessmentCount]);

  function downloadStatus() {
    const blob = new Blob([JSON.stringify(statusExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "diabcare-runtime-status.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function refresh() {
    void health.refetch();
    void summary.refetch();
    void me.refetch();
  }

  return <DashboardLayout>
    <div className="replica-page settings-page">
      <header className="replica-page-heading">
        <div><span className="replica-eyebrow"><span /> {language === "th" ? "การตั้งค่าระบบ" : "SYSTEM SETTINGS"}</span><h1>{language === "th" ? "ตั้งค่าและสถานะระบบ" : "Settings and system status"}</h1><p>{language === "th" ? "ตรวจสอบการเชื่อมต่อและการตั้งค่าที่ปลอดภัย โดยไม่เก็บคีย์ลับไว้ในเบราว์เซอร์" : "Review connectivity and safe application preferences without storing private keys in the browser."}</p></div>
        <div className="replica-heading-actions no-print"><button type="button" className="replica-secondary-button" onClick={refresh}><RefreshCw aria-hidden="true" /> {t("refresh")}</button></div>
      </header>

      <section className="replica-panel settings-profile-card"><div className="settings-profile-avatar"><UserRound aria-hidden="true" /></div><div><span className="replica-eyebrow">USER</span><h2>{me.data?.name || (language === "th" ? "ผู้ใช้งานปัจจุบัน" : "Current user")}</h2><p>{me.data?.email || (language === "th" ? "เซสชันภายใน" : "Application session")}</p></div><button type="button" className="settings-signout-button no-print" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut aria-hidden="true" /> {logout.isPending ? (language === "th" ? "กำลังออกจากระบบ…" : "Signing out…") : t("signOut")}</button></section>

      <section className="replica-panel settings-section"><div className="settings-section-heading"><div><span className="replica-eyebrow">{language === "th" ? "ความพร้อมใช้งาน" : "READINESS"}</span><h2>{language === "th" ? "สถานะระบบและการเชื่อมต่อ" : "System and connection status"}</h2></div><ServerCog aria-hidden="true" /></div><div className="settings-status-grid"><StatusCard icon={Database} label={language === "th" ? "ฐานข้อมูล Supabase" : "Supabase database"} ready={databaseReady} pending={health.isLoading} detail={databaseReady ? (language === "th" ? "เชื่อมต่อและอ่านข้อมูลได้" : "Connected and readable") : (language === "th" ? "ยังไม่พร้อมใช้งาน" : "Not available")} /><StatusCard icon={Activity} label={language === "th" ? "โมเดล YOLO" : "YOLO model"} ready={modelReady} pending={health.isLoading} detail={modelReady ? (language === "th" ? "แพ็กในเซิร์ฟเวอร์พร้อมใช้งาน" : "Packaged on the server") : (language === "th" ? "ไม่พบไฟล์โมเดล" : "Model file unavailable")} /><StatusCard icon={Activity} label={language === "th" ? "ตัวจำแนก AZH" : "AZH classifier"} ready={classifierReady} pending={health.isLoading} detail={classifierReady ? (language === "th" ? "แพ็กในเซิร์ฟเวอร์พร้อมใช้งาน" : "Packaged on the server") : health.data?.dependencies.classifier.enabled === false ? (language === "th" ? "ปิดใช้งานโดยเซิร์ฟเวอร์" : "Disabled by server flag") : (language === "th" ? "ไม่พบไฟล์โมเดล" : "Model file unavailable")} /><StatusCard icon={ShieldCheck} label={language === "th" ? "ที่เก็บภาพ" : "Media storage"} ready={storageReady} pending={health.isLoading} detail={storageReady ? (language === "th" ? "พร้อมจัดเก็บสื่อ" : "Ready for media") : (language === "th" ? "ยังไม่ได้ตั้งค่า storage adapter" : "Storage adapter not configured")} /><StatusCard icon={KeyRound} label={language === "th" ? "เซสชันผู้ใช้" : "User session"} ready={Boolean(me.data)} pending={me.isLoading} detail={me.data ? (language === "th" ? "เซสชันได้รับการยืนยัน" : "Session authenticated") : (language === "th" ? "ไม่พบเซสชัน" : "No authenticated session")} /></div></section>

      <section className="replica-panel settings-section"><div className="settings-section-heading"><div><span className="replica-eyebrow">{language === "th" ? "สำรองข้อมูล" : "BACKUP STATUS"}</span><h2>{language === "th" ? "สถานะข้อมูลที่เชื่อมต่อ" : "Connected data status"}</h2></div><Download aria-hidden="true" /></div><div className="settings-backup-copy"><p>{language === "th" ? "ข้อมูลผู้ป่วยอยู่ในฐานข้อมูลเซิร์ฟเวอร์ที่มีการควบคุม หน้านี้จะไม่ดาวน์โหลดข้อมูลสุขภาพทั้งหมดลงเครื่องโดยอัตโนมัติ" : "Patient records stay in the governed server database. This page doesn't silently download the full health dataset to the device."}</p><div className="settings-count-row"><span>{language === "th" ? "ผู้ป่วยที่ลงทะเบียน" : "Registered patients"}<strong>{summary.data?.registeredPatientCount ?? "—"}</strong></span><span>{language === "th" ? "การประเมินแผล" : "Wound assessments"}<strong>{summary.data?.woundAssessmentCount ?? "—"}</strong></span><span>{language === "th" ? "รูปแผลที่มองเห็น" : "Visible wound images"}<strong>{summary.data?.visiblePhotoCount ?? "—"}</strong></span></div><div className="settings-safety-note"><ShieldCheck aria-hidden="true" /><span>{language === "th" ? "ไฟล์ส่งออกนี้มีเฉพาะสถานะระบบ ไม่มีข้อมูลผู้ป่วยหรือคีย์ลับ" : "This export contains runtime status only. It includes no patient records or private keys."}</span></div><button type="button" className="settings-export-button no-print" onClick={downloadStatus}><Download aria-hidden="true" /> {language === "th" ? "ดาวน์โหลดสถานะระบบ JSON" : "Download runtime status JSON"}</button></div></section>

      <section className="replica-panel settings-section"><div className="settings-section-heading"><div><span className="replica-eyebrow">PREFERENCES</span><h2>{language === "th" ? "การตั้งค่าภายในแอป" : "Application preferences"}</h2></div><Globe2 aria-hidden="true" /></div><div className="settings-preference-row"><div><strong>{language === "th" ? "ภาษาแอป" : "Application language"}</strong><p>{language === "th" ? "สลับภาษาของหน้าจอโดยไม่แตะข้อมูลฐานข้อมูล" : "Switch the interface language without changing database data."}</p></div><button type="button" className="language-toggle settings-language-toggle" onClick={() => setLanguage(language === "th" ? "en" : "th")}><span className={language === "th" ? "is-active" : ""}>TH</span><span className={language === "en" ? "is-active" : ""}>EN</span></button></div><div className="settings-preference-row"><div><strong>{language === "th" ? "คีย์ API และปลายทางโมเดล" : "API keys and model endpoints"}</strong><p>{language === "th" ? "จัดการฝั่งเซิร์ฟเวอร์เท่านั้น ไม่รับคีย์ส่วนตัวผ่านเบราว์เซอร์" : "Managed server-side only. Private keys aren't accepted from the browser."}</p></div><span className="settings-readonly-badge"><WifiOff aria-hidden="true" /> {language === "th" ? "ควบคุมโดยเซิร์ฟเวอร์" : "Server controlled"}</span></div></section>

      <div className="settings-disclaimer"><TriangleAlert aria-hidden="true" /><p><strong>{t("decisionSupport")}</strong> {language === "th" ? "สถานะระบบช่วยตรวจสอบการเชื่อมต่อเท่านั้น ไม่ใช่การยืนยันผลการวินิจฉัย" : "System readiness only confirms connectivity. It doesn't validate a clinical diagnosis."}</p></div>
    </div>
  </DashboardLayout>;
}

function StatusCard({ icon: Icon, label, ready, pending, detail }: { icon: typeof Database; label: string; ready: boolean; pending: boolean; detail: string }) { return <div className="settings-status-card"><div className={`settings-status-icon ${ready ? "is-ready" : "is-muted"}`}><Icon aria-hidden="true" /></div><div><strong>{label}</strong><p>{pending ? "Loading…" : detail}</p></div><span className={`settings-status-pill ${ready ? "is-ready" : "is-muted"}`}>{pending ? "…" : ready ? "READY" : "NOT READY"}</span></div>; }
