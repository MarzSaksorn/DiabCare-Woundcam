import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, ArrowLeft, CalendarDays, ClipboardList, FileText, Image, Printer, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function Reports() {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const patients = trpc.diabetes.registeredPatientsPage.useQuery({ query: search, offset: 0, limit: 100 }, { retry: false });
  const record = trpc.diabetes.registeredPatientRecord.useQuery({ patientId: selectedId ?? 0 }, { enabled: selectedId !== null, retry: false });
  const rows = patients.data?.patients ?? [];
  const selectedPatient = useMemo(() => rows.find((patient) => patient.id === selectedId) ?? rows[0], [rows, selectedId]);

  useEffect(() => {
    if (selectedPatient && selectedPatient.id !== selectedId) setSelectedId(selectedPatient.id);
    if (!rows.length && selectedId !== null) setSelectedId(null);
  }, [rows, selectedId, selectedPatient]);

  function printReport() {
    window.print();
  }

  return (
    <DashboardLayout>
      <div className="replica-page reports-page">
        <header className="replica-page-heading">
          <div>
            <span className="replica-eyebrow"><span /> {language === "th" ? "เครื่องมือรายงาน" : "REPORT WORKSPACE"}</span>
            <h1>{language === "th" ? "รายงานและการประเมิน" : "Reports and assessment"}</h1>
            <p>{language === "th" ? "เลือกผู้ป่วยเพื่อทบทวนข้อมูลการประเมินและภาพที่บันทึกไว้จริงจากฐานข้อมูล" : "Choose a patient to review real wound assessments and captured evidence from the database."}</p>
          </div>
          <div className="replica-heading-actions no-print"><button type="button" className="replica-secondary-button" onClick={() => { void patients.refetch(); if (selectedId) void record.refetch(); }}><RefreshCw aria-hidden="true" /> {t("refresh")}</button><Link href="/patients" className="replica-secondary-button"><ArrowLeft aria-hidden="true" /> {language === "th" ? "กลับไปผู้ป่วย" : "Back to patients"}</Link></div>
        </header>

        <section className="replica-panel report-selector-panel no-print">
          <div className="report-selector-heading"><div><span className="replica-eyebrow">{language === "th" ? "ระเบียนที่เชื่อมต่อ" : "CONNECTED RECORD"}</span><h2>{language === "th" ? "เลือกผู้ป่วยเพื่อสร้างรายงาน" : "Choose a patient for the report"}</h2></div><ClipboardList aria-hidden="true" /></div>
          <div className="report-selector-controls"><div className="report-select-wrap"><UserRound aria-hidden="true" /><select aria-label={language === "th" ? "เลือกผู้ป่วย" : "Choose patient"} value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}><option value="">{language === "th" ? "เลือกผู้ป่วยที่ลงทะเบียน" : "Choose a registered patient"}</option>{rows.map((patient) => <option key={patient.id} value={patient.id}>{patient.displayName || patient.patientCode} · {patient.patientCode} · {patient.registrationLocation}</option>)}</select></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === "th" ? "ค้นหาด้วยรหัส ชื่อ หรือสถานที่" : "Search by code, name, or location"} aria-label={language === "th" ? "ค้นหาผู้ป่วย" : "Search patients"} /></div>
          {patients.isLoading && <div className="report-inline-state">{language === "th" ? "กำลังโหลดระเบียน…" : "Loading records…"}</div>}
          {patients.error && <div className="report-inline-state is-error"><AlertTriangle aria-hidden="true" /> {language === "th" ? "ไม่สามารถโหลดระเบียนจากฐานข้อมูล" : "The database records could not be loaded."}</div>}
          {!patients.isLoading && !patients.error && !rows.length && <div className="report-inline-state">{language === "th" ? "ไม่พบผู้ป่วยที่ตรงกัน" : "No matching registered patients."}</div>}
        </section>

        {!selectedPatient && <section className="replica-panel report-empty-panel"><FileText aria-hidden="true" /><h2>{language === "th" ? "เลือกผู้ป่วยเพื่อดูรายงาน" : "Choose a patient to view a report"}</h2><p>{language === "th" ? "หน้านี้ไม่สร้างผลการวิเคราะห์ตัวอย่างหรือข้อมูลผู้ป่วยจำลอง" : "This page never creates sample findings or synthetic patient data."}</p></section>}
        {selectedPatient && <ReportDocument language={language} t={t} patient={selectedPatient} record={record.data} loading={record.isLoading} error={record.error} onPrint={printReport} />}
      </div>
    </DashboardLayout>
  );
}

type Patient = { id: number; patientCode: string; displayName: string | null; age: number | null; registrationLocation: string; identifyBy: string; type1: number; type2: number; gdm: number; sex: "FEMALE" | "MALE"; createdAt: Date | string };
type ReportRecord = { patient: Patient & { clinicalNotes: string | null; diagnosesSummary: string | null; allergiesSummary: string | null; riskFlags: string | null; careTeam: string | null; updatedAt: Date | string }; medications: Array<unknown>; woundAssessments: Array<{ id: number; woundLabel: string; location: string; assessedOn: string; classification: string | null; lengthCm: number | null; widthCm: number | null; depthCm: number | null; painScore: number | null; infectionIndicators: string | null; treatmentPlan: string | null; clinicianNotes: string | null }>; media: Array<{ id: number; fileName: string; mimeType: string; capturedAt: Date | string | null; caption: string | null }>; auditEvents: Array<unknown>; importedObservations: Array<unknown> };

function ReportDocument({ language, t, patient, record, loading, error, onPrint }: { language: "th" | "en"; t: (key: string) => string; patient: Patient; record: ReportRecord | null | undefined; loading: boolean; error: unknown; onPrint: () => void }) {
  const wounds = record?.woundAssessments ?? [];
  const media = record?.media ?? [];
  const context = patient.type1 ? (language === "th" ? "เบาหวานชนิดที่ 1" : "Type 1 diabetes") : patient.type2 ? (language === "th" ? "เบาหวานชนิดที่ 2" : "Type 2 diabetes") : patient.gdm ? (language === "th" ? "เบาหวานขณะตั้งครรภ์" : "Gestational diabetes") : (language === "th" ? "ไม่ได้บันทึก" : "Not recorded");
  return <section className="report-document replica-panel">
    <div className="report-document-toolbar no-print"><div><span className="report-letterhead">DIABCARE CLINICAL REVIEW</span><h2>{language === "th" ? "รายงานสรุปการประเมินแผลเบาหวาน" : "Diabetic wound assessment report"}</h2></div><button type="button" className="replica-primary-button" onClick={onPrint}><Printer aria-hidden="true" /> {language === "th" ? "พิมพ์ / บันทึก PDF" : "Print / Save PDF"}</button></div>
    {loading && <div className="report-loading"><span /><span /><span /></div>}
    {!loading && Boolean(error) && <div className="report-inline-state is-error"><AlertTriangle aria-hidden="true" /> {language === "th" ? "ไม่สามารถโหลดรายละเอียดรายงาน" : "The report details could not be loaded."}</div>}
    {!loading && !error && record && <>
      <div className="report-document-header"><div><span>{language === "th" ? "ระเบียนผู้ป่วย" : "PATIENT RECORD"}</span><strong>{patient.displayName || patient.patientCode}</strong><small>{patient.patientCode} · {patient.registrationLocation}</small></div><div className="report-ref"><span>{language === "th" ? "อัปเดตล่าสุด" : "Last updated"}</span><strong>{formatDate(record.patient.updatedAt, language)}</strong></div></div>
      <div className="report-profile-grid"><ReportField label={language === "th" ? "รหัสผู้ป่วย" : "Patient code"} value={patient.patientCode} /><ReportField label={language === "th" ? "อายุ / เพศ" : "Age / sex"} value={`${patient.age ?? "—"} · ${patient.sex === "FEMALE" ? (language === "th" ? "หญิง" : "Female") : (language === "th" ? "ชาย" : "Male")}`} /><ReportField label={language === "th" ? "บริบทเบาหวาน" : "Diabetes context"} value={context} /><ReportField label={language === "th" ? "ระบุโดย" : "Identified by"} value={patient.identifyBy} /></div>
      <div className="report-section-heading"><div><span>{language === "th" ? "หลักฐานจากระเบียน" : "RECORDED EVIDENCE"}</span><h3>{language === "th" ? "การประเมินและภาพถ่าย" : "Assessments and captured images"}</h3></div><Image aria-hidden="true" /></div>
      {!wounds.length && !media.length && <div className="report-empty-evidence"><ShieldAlert aria-hidden="true" /><div><strong>{language === "th" ? "ยังไม่มีการประเมินหรือภาพแผลที่บันทึกไว้" : "No wound assessment or image has been recorded"}</strong><p>{language === "th" ? "รายงานนี้แสดงเฉพาะข้อมูลจริงจากฐานข้อมูล จึงยังไม่มีผลวิเคราะห์หรือคำแนะนำที่จะแสดง" : "This report only shows database-backed records, so no model findings or recommendations are shown yet."}</p></div></div>}
      {wounds.map((wound) => <div className="report-evidence-row" key={wound.id}><div className="report-evidence-icon"><ClipboardList aria-hidden="true" /></div><div><strong>{wound.woundLabel} · {wound.location}</strong><p>{wound.assessedOn} · {wound.classification || (language === "th" ? "ไม่ได้จำแนก" : "Classification not recorded")}</p></div><span>{wound.lengthCm !== null && wound.widthCm !== null ? `${wound.lengthCm} × ${wound.widthCm}${wound.depthCm !== null ? ` × ${wound.depthCm}` : ""} cm` : (language === "th" ? "ไม่บันทึกขนาด" : "Measurements not recorded")}</span></div>)}
      {media.map((photo) => <div className="report-evidence-row" key={photo.id}><div className="report-evidence-icon is-cyan"><Image aria-hidden="true" /></div><div><strong>{photo.fileName}</strong><p>{photo.caption || (language === "th" ? "ภาพแผลที่บันทึกไว้" : "Captured wound image")}</p></div><span>{photo.capturedAt ? formatDate(photo.capturedAt, language) : (language === "th" ? "ไม่บันทึกวันที่" : "Date not recorded")}</span></div>)}
      <div className="report-disclaimer"><ShieldAlert aria-hidden="true" /><p><strong>{t("decisionSupport")}</strong> {language === "th" ? "รายงานนี้ไม่ใช่การวินิจฉัย และไม่มีผลสรุปจากข้อมูลที่ยังไม่ได้บันทึกโดยบุคลากรทางคลินิก" : "This report isn't a diagnosis. It doesn't create findings from data that a clinician hasn't recorded."}</p></div>
      <div className="report-foot"><span>{formatNumber(wounds.length, language)} {language === "th" ? "การประเมิน" : "assessments"} · {formatNumber(media.length, language)} {language === "th" ? "ภาพ" : "images"}</span><span>{language === "th" ? "ข้อมูลจากเซิร์ฟเวอร์ที่เชื่อมต่อ" : "Connected server data"}</span></div>
    </>}
  </section>;
}

function ReportField({ label, value }: { label: string; value: string }) { return <div className="report-field"><span>{label}</span><strong>{value}</strong></div>; }
