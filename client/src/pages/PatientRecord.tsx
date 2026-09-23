import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Flag,
  HeartPulse,
  ImageOff,
  Info,
  LockKeyhole,
  MoreHorizontal,
  Ruler,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const tabs = ["Overview", "Observations", "Wounds", "Timeline", "Audit trail"] as const;
type Tab = (typeof tabs)[number];
type ObservationRow = { id: number; sourceColumn: string; dictionaryField: string; periodKey: number | null; valueNumber: string | null; valueText: string | null };

function formatField(field: string) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof ImageOff; title: string; description: string; action?: string }) {
  const { t } = useLanguage();
  return <div className="record-empty-state"><div className="record-empty-icon"><Icon className="h-5 w-5" /></div><h3>{title}</h3><p>{description}</p>{action && <Button onClick={() => toast.info(t("clinicalDomainUnavailable"))} variant="outline" className="mt-4 h-9 rounded-lg border-slate-200 text-xs text-slate-600">{action}</Button>}</div>;
}

export default function PatientRecord() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/patients/:id");
  const patientId = Number(params?.id ?? 0);
  const [tab, setTab] = useState<Tab>("Overview");
  const { t } = useLanguage();
  const [selectedObservation, setSelectedObservation] = useState<ObservationRow | null>(null);
  const detail = trpc.diabetes.detail.useQuery({ patientId }, { enabled: patientId > 0 });
  const observations = trpc.diabetes.observations.useQuery({ patientId, limit: 24 }, { enabled: patientId > 0 });
  const patient = detail.data;
  const observationRows = (observations.data ?? []) as ObservationRow[];
  const sourceLabel = patient ? `Imported cohort record #${patient.sourceRowNumber - 1}` : t("patientRecord");

  if (detail.isLoading) return <div className="record-page"><div className="record-skeleton"><div /><div /><div /><div /></div></div>;
  if (detail.error || !patient) return <div className="record-page"><div className="record-error"><ShieldAlert className="h-6 w-6 text-[#c86b52]" /><div><h1>{t("recordUnavailable")}</h1><p>{t("signInRequired")}</p><Button onClick={() => setLocation("/patients")} variant="outline" className="mt-4 h-9 rounded-lg">{t("backToPatients")}</Button></div></div></div>;

  const recordedFlags = [patient.type1, patient.type2, patient.gdm, patient.dmOnset].filter(Boolean).length;

  return <div className="record-page">
    <div className="record-topbar"><Link href="/patients" className="record-back"><ArrowLeft className="h-4 w-4" /> {t("patients")}</Link><div className="record-topbar-meta"><span><LockKeyhole className="h-3.5 w-3.5" /> {t("scopedClinicalView")}</span><span className="hidden sm:inline">{t("localDatabase")}</span></div></div>

    <header className="record-header panel-card">
      <div className="record-identity"><div className="record-avatar"><UserRound className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1>{sourceLabel}</h1><span className="record-state record-state-imported"><span /> {t("importedUnverified")}</span></div><p className="record-subtitle">{t("internalRecord")} {patient.id} · {t("sourceRow")} {patient.sourceRowNumber} · {patient.sourceFilename}</p></div><Button onClick={() => toast.info(t("recordActions"))} variant="outline" className="ml-auto hidden h-9 rounded-lg border-slate-200 text-xs sm:flex"><MoreHorizontal className="mr-2 h-4 w-4" /> {t("recordActions")}</Button></div>
      <div className="record-facts"><div><span>{t("age")}</span><strong>{patient.age || t("notRecorded")}</strong></div><div><span>{t("sex")}</span><strong>{patient.sex || t("notRecorded")}</strong></div><div><span>{t("diabetesContext")}</span><strong>{patient.type2 ? t("type2Recorded") : patient.type1 ? t("type1Recorded") : patient.gdm ? t("gdmRecorded") : t("notSpecified")}</strong></div><div><span>{t("identifiedBy")}</span><strong>{patient.identifyBy || t("notRecorded")}</strong></div><div><span>{t("observations")}</span><strong>{patient.observationCount.toLocaleString()}</strong></div></div>
    </header>

    <section className="record-kpi-grid" aria-label={t("recordSummaryMetrics")}><Kpi icon={ClipboardList} label={t("recordedObservations")} value={patient.observationCount.toLocaleString()} helper={t("sourcePreservedValues")} tone="navy" /><Kpi icon={Flag} label={t("baselineFlagsCount")} value={`${recordedFlags}/4`} helper={t("fieldsWithValue")} tone="sage" /><Kpi icon={HeartPulse} label={t("woundAssessments")} value="0" helper={t("noWoundEntity")} tone="terracotta" /><Kpi icon={CalendarClock} label={t("reviewStatus")} value={t("review")} helper={t("clinicalConfirmationNeeded")} tone="amber" /></section>

    <section className="record-safety"><div className="record-safety-icon"><Info className="h-4 w-4" /></div><div><p><strong>{t("importedBaseline")}</strong> {t("importedBaselineDetail")}</p><span>{t("reviewSource")}</span></div><Button onClick={() => toast.info(`Source: ${patient.sourceFilename}, row ${patient.sourceRowNumber}`)} variant="ghost" className="ml-auto hidden h-8 shrink-0 rounded-lg px-2 text-xs text-[#4f7463] sm:block">{t("viewProvenance")}</Button></section>

    <nav className="record-tabs" aria-label={t("patientRecords")}>{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item === "Overview" ? t("overview") : item === "Observations" ? t("observations") : item === "Wounds" ? t("woundProgress") : item === "Timeline" ? t("timeline") : t("auditTrail")}{item === "Observations" && <span>{patient.observationCount.toLocaleString()}</span>}</button>)}</nav>

    {tab === "Overview" && <div className="record-grid"><section className="record-section panel-card"><SectionHeading kicker={t("currentContext")} title={t("whatNeedsAttention")} icon={Flag} /><div className="record-review-list"><ReviewRow icon={ShieldAlert} title={t("importedSourceNotVerified")} detail={t("confirmSource")} priority={t("review")} tone="amber" /><ReviewRow icon={CalendarClock} title={t("noWoundAssessment")} detail={t("noWoundAssessmentDetail")} priority={t("info")} /></div></section><section className="record-section panel-card"><SectionHeading kicker={t("baselineFlags")} title={t("recordedDiabetesContext")} icon={Activity} /><div className="context-grid"><ContextValue label={t("type1Indicator")} value={patient.type1} /><ContextValue label={t("type2Indicator")} value={patient.type2} /><ContextValue label={t("gestationalIndicator")} value={patient.gdm} /><ContextValue label={t("onsetField")} value={patient.dmOnset} /></div><p className="record-footnote">{t("sourceDictionaryNote")}</p></section><section className="record-section panel-card record-section-wide"><div className="record-section-heading"><div><p className="record-kicker">{t("latestRecordedActivity")}</p><h2>{t("observationHistory")}</h2><p className="record-section-description">{t("selectObservationHint")}</p></div><Button onClick={() => setTab("Observations")} variant="ghost" className="h-8 rounded-lg px-2 text-xs font-bold text-[#4f7463]">{t("viewAll")} <ChevronDown className="ml-1 h-3.5 w-3.5 -rotate-90" /></Button></div><ObservationList observations={observationRows.slice(0, 6)} loading={observations.isLoading} onSelect={setSelectedObservation} /></section><section className="record-section panel-card"><SectionHeading kicker={t("woundCare")} title={t("woundProgress")} icon={HeartPulse} /><EmptyState icon={ImageOff} title={t("noWoundRecord")} description={t("noWoundDescription")} /></section><section className="record-section panel-card"><SectionHeading kicker={t("careTeam")} title={t("assignedPeople")} icon={UserRound} /><EmptyState icon={UserRound} title={t("noCareTeam")} description={t("noCareTeamDescription")} /></section></div>}

    {tab === "Observations" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">{t("clinicalObservations")}</p><h2>{t("sourcePreservedHistory")}</h2><p className="record-section-description">{t("observationHistoryDescription")}</p></div><Button onClick={() => toast.info(t("observationDateNote"))} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><CalendarClock className="mr-2 h-3.5 w-3.5" /> {t("dateRange")} <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><ObservationList observations={observationRows} loading={observations.isLoading} onSelect={setSelectedObservation} /></section>}

    {tab === "Wounds" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">{t("woundProgress")}</p><h2>{t("multipleWoundWorkspace")}</h2><p className="record-section-description">{t("woundWorkspaceDescription")}</p></div><Button onClick={() => toast.info(t("woundPermissionNote"))} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Ruler className="mr-2 h-3.5 w-3.5" /> {t("newAssessment")}</Button></div><EmptyState icon={ImageOff} title={t("noWoundRecord")} description={t("woundMeasurementsUnavailable")} action={t("reviewDataRequirements")} /></section>}

    {tab === "Timeline" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">{t("timeline")}</p><h2>{t("recordHistory")}</h2><p className="record-section-description">{t("timelineDescription")}</p></div><Button onClick={() => toast.info(t("timelineRangeNote"))} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Clock3 className="mr-2 h-3.5 w-3.5" /> {t("fullHistory")} <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><div className="record-timeline"><TimelineItem imported title={t("sourceImported")} meta={`${t("workbookBatch")} #${patient.importBatchId}`} detail={`${patient.observationCount.toLocaleString()} ${t("nonNullObservations")}`} />{observationRows.slice(0, 8).map((observation) => <TimelineItem key={observation.id} title={formatField(observation.dictionaryField)} meta={`${t("periodKey")} ${observation.periodKey ?? t("baseline")}`} detail={< >{t("sourceFieldRecorded")} <code>{observation.sourceColumn}</code></>} />)}</div></section>}

    {tab === "Audit trail" && <section className="record-section panel-card"><SectionHeading kicker={t("accessAndChanges")} title={t("auditTrail")} icon={LockKeyhole} /><EmptyState icon={LockKeyhole} title={t("auditEventsMissing")} description={t("noAuditAttached")} /></section>}

    {selectedObservation && <ObservationDrawer observation={selectedObservation} onClose={() => setSelectedObservation(null)} />}
  </div>;
}

function Kpi({ icon: Icon, label, value, helper, tone }: { icon: typeof Activity; label: string; value: string; helper: string; tone: "navy" | "sage" | "terracotta" | "amber" }) { return <div className="record-kpi panel-card"><div className={`metric-icon metric-icon-${tone}`}><Icon className="h-[17px] w-[17px]" /></div><div className="min-w-0"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>; }
function SectionHeading({ kicker, title, icon: Icon }: { kicker: string; title: string; icon: typeof Activity }) { return <div className="record-section-heading"><div><p className="record-kicker">{kicker}</p><h2>{title}</h2></div><Icon className="h-4 w-4 text-slate-300" /></div>; }
function ContextValue({ label, value }: { label: string; value: string | number | null | undefined }) { const { t } = useLanguage(); return <div><span>{label}</span><strong>{value || t("notRecorded")}</strong></div>; }
function ReviewRow({ icon: Icon, title, detail, priority, tone }: { icon: typeof ShieldAlert; title: string; detail: string; priority: string; tone?: "amber" }) { return <div className={`review-row ${tone === "amber" ? "review-row-amber" : ""}`}><div className="review-row-icon"><Icon className="h-4 w-4" /></div><div><strong>{title}</strong><p>{detail}</p></div><span className={`review-priority ${tone ? "" : "neutral"}`}>{priority}</span></div>; }
function ObservationList({ observations, loading, onSelect }: { observations: ObservationRow[]; loading: boolean; onSelect: (observation: ObservationRow) => void }) { const { t } = useLanguage(); if (loading) return <div className="observation-loading"><div /><div /><div /></div>; if (observations.length === 0) return <EmptyState icon={ClipboardList} title={t("noObservations")} description={t("confirmImport")} />; return <div className="observation-list">{observations.map((observation) => <button className="observation-row" key={observation.id} onClick={() => onSelect(observation)}><div className="observation-icon"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{formatField(observation.dictionaryField)}</strong><span className="observation-source">{observation.sourceColumn}</span></div><p>{t("periodKey")} {observation.periodKey ?? t("baseline")} · {t("sourceValue")}</p></div><div className="observation-value">{observation.valueNumber ?? observation.valueText ?? t("notRecorded")}</div><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></button>)}</div>; }
function TimelineItem({ imported, title, meta, detail }: { imported?: boolean; title: string; meta: string; detail: React.ReactNode }) { return <div className="record-timeline-item"><div className={`record-timeline-marker ${imported ? "imported" : ""}`}><Activity className="h-3.5 w-3.5" /></div><div><div className="record-timeline-meta"><span>{title}</span><time>{meta}</time></div><p>{detail}</p></div></div>; }
function ObservationDrawer({ observation, onClose }: { observation: ObservationRow; onClose: () => void }) { const { t } = useLanguage(); return <div className="record-drawer-backdrop" role="presentation" onClick={onClose}><aside className="record-drawer" role="dialog" aria-modal="true" aria-labelledby="observation-drawer-title" onClick={(event) => event.stopPropagation()}><div className="record-drawer-head"><div><p className="record-kicker">{t("observationDetail")}</p><h2 id="observation-drawer-title">{formatField(observation.dictionaryField)}</h2></div><button onClick={onClose} aria-label={t("closeObservationDetail")} className="record-drawer-close"><X className="h-4 w-4" /></button></div><div className="record-drawer-value"><span>{t("sourceValue")}</span><strong>{observation.valueNumber ?? observation.valueText ?? t("notRecorded")}</strong></div><dl className="record-drawer-fields"><div><dt>{t("sourceColumn")}</dt><dd>{observation.sourceColumn}</dd></div><div><dt>{t("dictionaryField")}</dt><dd>{observation.dictionaryField}</dd></div><div><dt>{t("periodKey")}</dt><dd>{observation.periodKey ?? t("baseline")}</dd></div><div><dt>{t("recordHandling")}</dt><dd>{t("preservedFromImport")}</dd></div></dl><div className="record-drawer-note"><FileText className="h-4 w-4" /><p>{t("noUnits")}</p></div></aside></div>; }
