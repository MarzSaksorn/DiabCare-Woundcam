import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft, CalendarClock, ClipboardList, Clock3, Download, Edit3, FileText, Flag, HeartPulse, Image, Info, LockKeyhole, Ruler, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/locale";
import { WoundPhotoGallery } from "@/components/WoundPhotoGallery";

type Tab = "Overview" | "Medications" | "Wounds" | "Photos" | "Timeline" | "Audit trail";
const tabs: Tab[] = ["Overview", "Medications", "Wounds", "Photos", "Timeline", "Audit trail"];

type WoundPoint = { assessedOn: string; area: number | null; label: string };

export default function RegisteredPatientRecord() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/patients/registered/:id");
  const patientId = Number(params?.id ?? 0);
  const { language, t } = useLanguage();
  const [tab, setTab] = useState<Tab>("Overview");
  const record = trpc.diabetes.registeredPatientRecord.useQuery({ patientId }, { enabled: patientId > 0 });
  const exportPatient = trpc.diabetes.exportPatient.useMutation();
  const patient = record.data?.patient;
  const medications = record.data?.medications ?? [];
  const wounds = record.data?.woundAssessments ?? [];
  const audits = record.data?.auditEvents ?? [];
  const media = record.data?.media ?? [];

  const woundPoints = useMemo<WoundPoint[]>(() => wounds.slice().reverse().map((item) => ({ assessedOn: item.assessedOn, area: item.lengthCm !== null && item.widthCm !== null ? item.lengthCm * item.widthCm : null, label: item.woundLabel })), [wounds]);
  const latestWound = wounds[0];
  const activeMedicationCount = medications.filter((item) => item.status === "active").length;
  const riskCount = [patient?.riskFlags, patient?.allergiesSummary, latestWound?.infectionIndicators].filter(Boolean).length;

  async function downloadExport(format: "json" | "csv") {
    const result = await exportPatient.mutateAsync({ patientId });
    if (!result) return;
    const content = format === "json" ? JSON.stringify(result, null, 2) : csvFromRecord(result);
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.patient.patientCode}-record.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportReady"));
  }

  if (record.isLoading) return <div className="record-page"><div className="record-skeleton"><div /><div /><div /><div /></div></div>;
  if (record.error || !patient) return <div className="record-page"><div className="record-error"><ShieldAlert className="h-6 w-6 text-[#E84D67]" /><div><h1>{t("recordUnavailable")}</h1><p>{t("signInRequired")}</p><Button onClick={() => setLocation("/patients")} variant="outline" className="mt-4 h-9 rounded-lg">{t("backToPatients")}</Button></div></div></div>;

  const diabetesContext = patient.type1 ? t("type1") : patient.type2 ? t("type2") : patient.gdm ? t("gdm") : t("notSpecified");
  const woundChart = woundPoints.filter((point) => point.area !== null);

  return <div className="record-page record-reference-page">
    <div className="record-topbar"><Link href="/patients" className="record-back"><ArrowLeft className="h-4 w-4" /> {t("patients")}</Link><div className="record-topbar-meta"><span><LockKeyhole className="h-3.5 w-3.5" /> {t("scopedClinicalView")}</span><span className="hidden sm:inline">{t("localDatabase")}</span></div></div>
    <header className="record-header panel-card reference-hero">
      <div className="record-identity"><div className="record-avatar"><UserRound className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1>{patient.displayName || patient.patientCode}</h1><span className="record-state record-state-imported"><span /> {t("activeRecord")}</span></div><p className="record-subtitle">{patient.patientCode} · {patient.registrationLocation} · {t("updatedAt")} {formatDate(patient.updatedAt, language)}</p></div><Button onClick={() => setLocation(`/patients/registered/${patient.id}/edit`)} className="ml-auto h-9 rounded-lg bg-[#16345C] text-xs text-white"><Edit3 className="mr-2 h-4 w-4" />{t("editPatient")}</Button></div>
      <div className="reference-action-bar"><HeartPulse className="h-4 w-4" /> {t("registeredRecordBanner")}</div>
    </header>
    <section className="record-safety"><div className="record-safety-icon"><Info className="h-4 w-4" /></div><div><p><strong>{t("clinicalOverview")}</strong> {t("clinicalOverviewDetail")}</p><span>{t("decisionSupport")}</span></div><div className="ml-auto flex gap-2"><Button onClick={() => downloadExport("json")} variant="ghost" className="hidden h-8 rounded-lg px-2 text-xs text-[#0A4FBE] sm:block">{t("exportJson")}</Button><Button onClick={() => downloadExport("csv")} variant="ghost" className="hidden h-8 rounded-lg px-2 text-xs text-[#0A4FBE] sm:block">{t("exportCsv")}</Button></div></section>
    <nav className="record-tabs" aria-label={t("patientRecords")}>{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item === "Overview" ? t("overview") : item === "Medications" ? t("medicationsSection") : item === "Wounds" ? t("woundProgress") : item === "Photos" ? t("woundPhotos") : item === "Timeline" ? t("timeline") : t("auditTrail")}{item === "Medications" && <span>{formatNumber(medications.length, language)}</span>}{item === "Wounds" && <span>{formatNumber(wounds.length, language)}</span>}{item === "Photos" && <span>{formatNumber(media.length, language)}</span>}</button>)}</nav>

    {tab === "Overview" && <div className="reference-stack">
      <ReferenceSection icon={UserRound} title={t("patientProfile")} kicker={t("patientInformation")}><div className="reference-profile-grid"><InfoPair label={t("patientCode")} value={patient.patientCode} /><InfoPair label={t("age")} value={patient.age === null ? t("notRecorded") : formatNumber(patient.age, language)} /><InfoPair label={t("sex")} value={patient.sex === "FEMALE" ? t("female") : t("male")} /><InfoPair label={t("diabetesContext")} value={diabetesContext} /><InfoPair label={t("identifiedBy")} value={patient.identifyBy} /><InfoPair label={t("careTeam")} value={patient.careTeam || t("notRecorded")} /></div><div className="reference-note-grid"><InfoPair label={t("diagnoses")} value={patient.diagnosesSummary || t("notRecorded")} /><InfoPair label={t("allergies")} value={patient.allergiesSummary || t("notRecorded")} /><InfoPair label={t("riskFlags")} value={patient.riskFlags || t("notRecorded")} /><InfoPair label={t("clinicalNotes")} value={patient.clinicalNotes || t("notRecorded")} /></div></ReferenceSection>
      <div className="reference-kpi-row"><MiniStat label={t("activeMedications")} value={formatNumber(activeMedicationCount, language)} /><MiniStat label={t("woundAssessments")} value={formatNumber(wounds.length, language)} /><MiniStat label={t("reviewFlags")} value={formatNumber(riskCount, language)} tone={riskCount ? undefined : "muted"} /></div>
      <ReferenceSection icon={Activity} title={t("healingTrend")} kicker={t("longitudinalReview")}><HealingChart points={woundChart} t={t} language={language} /></ReferenceSection>
      <ReferenceSection icon={ClipboardList} title={t("medicationsSection")} kicker={t("sourcePreservedHistory")}><MedicationList medications={medications} t={t} /></ReferenceSection>
      <ReferenceSection icon={ShieldAlert} title={t("attentionSection")} kicker={t("clinicalReview")}><div className="reference-alert-list"><ReviewRow icon={ShieldAlert} title={patient.riskFlags ? t("riskFlagsPresent") : t("noRiskFlags")} detail={patient.riskFlags || t("noRiskFlagsDetail")} priority={patient.riskFlags ? t("review") : t("info")} tone={patient.riskFlags ? "amber" : undefined} /><ReviewRow icon={CalendarClock} title={latestWound ? t("latestWoundAssessment") : t("noWoundAssessment")} detail={latestWound ? `${latestWound.woundLabel} · ${latestWound.assessedOn}` : t("noWoundAssessmentDetail")} priority={latestWound?.infectionIndicators ? t("review") : t("info")} tone={latestWound?.infectionIndicators ? "amber" : undefined} /></div></ReferenceSection>
      <ReferenceSection icon={Ruler} title={t("woundSection")} kicker={t("woundCare")}><WoundList wounds={wounds.slice(0, 4)} t={t} /></ReferenceSection>
      <ReferenceSection icon={Image} title={t("woundPhotos")} kicker={t("imageHistory")}><WoundPhotoGallery photos={media} t={t} onChanged={() => void record.refetch()} /></ReferenceSection>
    </div>}
    {tab === "Medications" && <ReferenceSection icon={FileText} title={t("medicationHistory")} kicker={t("clinicalReview")}><MedicationList medications={medications} t={t} /></ReferenceSection>}
    {tab === "Wounds" && <div className="reference-stack"><ReferenceSection icon={HeartPulse} title={t("woundProgress")} kicker={t("multipleWoundWorkspace")}><WoundList wounds={wounds} t={t} /></ReferenceSection><ReferenceSection icon={Activity} title={t("healingTrend")} kicker={t("longitudinalReview")}><HealingChart points={woundChart} t={t} language={language} /></ReferenceSection></div>}
    {tab === "Photos" && <ReferenceSection icon={Image} title={t("woundPhotos")} kicker={t("imageHistory")}><WoundPhotoGallery photos={media} t={t} onChanged={() => void record.refetch()} /></ReferenceSection>}
    {tab === "Timeline" && <ReferenceSection icon={Clock3} title={t("recordHistory")} kicker={t("timeline")}><div className="timeline">{audits.length ? audits.map((event) => <div className="timeline-row" key={event.id}><div className="timeline-date">{formatDate(event.createdAt, language)}</div><div className="timeline-marker" /><div><strong>{event.summary}</strong><p>{event.eventType}</p></div></div>) : <EmptyState title={t("noAuditEvents")} description={t("noAuditEvents")} />}</div></ReferenceSection>}
    {tab === "Audit trail" && <ReferenceSection icon={LockKeyhole} title={t("auditTrail")} kicker={t("accessAndChanges")}><div className="timeline">{audits.length ? audits.map((event) => <div className="timeline-row" key={event.id}><div className="timeline-date">{formatDate(event.createdAt, language)}</div><div className="timeline-marker" /><div><strong>{event.summary}</strong><p>{event.eventType}</p></div></div>) : <EmptyState title={t("noAuditEvents")} description={t("noAuditEvents")} />}</div></ReferenceSection>}
  </div>;
}

function ReferenceSection({ icon: Icon, title, kicker, children }: { icon: typeof Activity; title: string; kicker: string; children: ReactNode }) { return <section className="reference-section panel-card"><div className="reference-section-heading"><div><p className="record-kicker">{kicker}</p><h2>{title}</h2></div><Icon className="h-4 w-4 text-[#7ba58e]" /></div>{children}</section>; }
function InfoPair({ label, value }: { label: string; value: string }) { return <div className="reference-info-pair"><span>{label}</span><strong>{value}</strong></div>; }
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "muted" }) { return <div className={`reference-mini-stat ${tone === "muted" ? "muted" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function MedicationList({ medications, t }: { medications: Array<{ id: number; medicationName: string; dose: string | null; route: string | null; frequency: string | null; status: string; startedOn: string | null; endedOn: string | null; notes: string | null }>; t: (key: string) => string }) { if (!medications.length) return <EmptyState title={t("noMedicationHistory")} description={t("noMedicationHistory")} />; return <div className="reference-observation-grid">{medications.map((item) => <div className="reference-observation-card" key={item.id}><span>{item.medicationName}</span><strong>{[item.dose, item.route, item.frequency].filter(Boolean).join(" · ") || t("notRecorded")}</strong><small>{item.status} · {item.startedOn || "—"} → {item.endedOn || t("ongoing")}</small>{item.notes && <p className="mt-2 text-xs text-slate-500">{item.notes}</p>}</div>)}</div>; }
function WoundList({ wounds, t }: { wounds: Array<{ id: number; woundLabel: string; location: string; assessedOn: string; classification: string | null; lengthCm: number | null; widthCm: number | null; depthCm: number | null; painScore: number | null; treatmentPlan: string | null; infectionIndicators: string | null }>; t: (key: string) => string }) { if (!wounds.length) return <EmptyState title={t("noWoundRecord")} description={t("woundMeasurementsUnavailable")} />; return <div className="reference-observation-grid">{wounds.map((item) => <div className="reference-observation-card" key={item.id}><span>{item.woundLabel} · {item.location}</span><strong>{item.lengthCm !== null && item.widthCm !== null ? `${item.lengthCm} × ${item.widthCm}${item.depthCm !== null ? ` × ${item.depthCm}` : ""} cm` : t("measurementsNotRecorded")}</strong><small>{item.assessedOn} · {t("painScore")} {item.painScore ?? "—"}/10</small>{item.infectionIndicators && <p className="mt-2 text-xs text-[#b55d45]">{t("infectionIndicators")}: {item.infectionIndicators}</p>}{item.treatmentPlan && <p className="mt-2 text-xs text-slate-500">{t("treatmentPlan")}: {item.treatmentPlan}</p>}</div>)}</div>; }
function HealingChart({ points, t, language }: { points: WoundPoint[]; t: (key: string) => string; language: "en" | "th" }) { if (points.length < 2) return <EmptyState title={t("trendUnavailable")} description={t("trendUnavailableDetail")} />; const values = points.map((point) => point.area as number); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min); const coordinates = points.map((point, index) => `${40 + index * (680 / Math.max(1, points.length - 1))},${175 - (((point.area as number) - min) / range) * 130}`).join(" "); return <div className="reference-trend-card"><div className="trend-header"><div><strong>{t("woundAreaTrend")}</strong><span>{t("decisionSupport")}</span></div><span>{formatNumber(values[values.length - 1], language, { maximumFractionDigits: 2 })} cm²</span></div><svg className="reference-chart" viewBox="0 0 760 210" role="img" aria-label={t("trendChartLabel")}><path d="M30 175 H735 M30 25 V175" stroke="#e4ebe6" fill="none" /><polyline points={coordinates} fill="none" stroke="#2b79c2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => <circle key={`${point.assessedOn}-${index}`} cx={40 + index * (680 / Math.max(1, points.length - 1))} cy={175 - (((point.area as number) - min) / range) * 130} r="5" fill="#fff" stroke="#2b79c2" strokeWidth="3" />)}</svg><div className="trend-footnote">{points.map((point) => `${point.assessedOn}: ${formatNumber(point.area, language, { maximumFractionDigits: 2 })} cm²`).join(" · ")}</div></div>; }
function ReviewRow({ icon: Icon, title, detail, priority, tone }: { icon: typeof ShieldAlert; title: string; detail: string; priority: string; tone?: "amber" }) { return <div className={`review-row ${tone === "amber" ? "review-row-amber" : ""}`}><div className="review-row-icon"><Icon className="h-4 w-4" /></div><div><strong>{title}</strong><p>{detail}</p></div><span className={`review-priority ${tone ? "" : "neutral"}`}>{priority}</span></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="record-empty-state"><div className="record-empty-icon"><Flag className="h-5 w-5" /></div><h3>{title}</h3><p>{description}</p></div>; }
function csvFromRecord(record: { patient: Record<string, unknown>; medications: Array<Record<string, unknown>>; woundAssessments: Array<Record<string, unknown>>; auditEvents: Array<Record<string, unknown>> }) { const rows: Array<Record<string, unknown>> = [{ section: "patient", ...record.patient }, ...record.medications.map((item) => ({ section: "medication", ...item })), ...record.woundAssessments.map((item) => ({ section: "wound_assessment", ...item })), ...record.auditEvents.map((item) => ({ section: "audit", ...item }))]; const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n"); }
