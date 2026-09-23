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
  return <div className="record-empty-state"><div className="record-empty-icon"><Icon className="h-5 w-5" /></div><h3>{title}</h3><p>{description}</p>{action && <Button onClick={() => toast.info("This clinical domain is not enabled for the imported cohort yet.")} variant="outline" className="mt-4 h-9 rounded-lg border-slate-200 text-xs text-slate-600">{action}</Button>}</div>;
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
  const sourceLabel = patient ? `Imported cohort record #${patient.sourceRowNumber - 1}` : "Patient record";

  if (detail.isLoading) return <div className="record-page"><div className="record-skeleton"><div /><div /><div /><div /></div></div>;
  if (detail.error || !patient) return <div className="record-page"><div className="record-error"><ShieldAlert className="h-6 w-6 text-[#c86b52]" /><div><h1>{t("recordUnavailable")}</h1><p>{t("signInRequired")}</p><Button onClick={() => setLocation("/patients")} variant="outline" className="mt-4 h-9 rounded-lg">{t("backToPatients")}</Button></div></div></div>;

  const recordedFlags = [patient.type1, patient.type2, patient.gdm, patient.dmOnset].filter(Boolean).length;

  return <div className="record-page">
    <div className="record-topbar"><Link href="/patients" className="record-back"><ArrowLeft className="h-4 w-4" /> {t("patients")}</Link><div className="record-topbar-meta"><span><LockKeyhole className="h-3.5 w-3.5" /> {t("scopedClinicalView")}</span><span className="hidden sm:inline">{t("localDatabase")}</span></div></div>

    <header className="record-header panel-card">
      <div className="record-identity"><div className="record-avatar"><UserRound className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1>{sourceLabel}</h1><span className="record-state record-state-imported"><span /> {t("importedUnverified")}</span></div><p className="record-subtitle">{t("internalRecord")} {patient.id} · {t("sourceRow")} {patient.sourceRowNumber} · {patient.sourceFilename}</p></div><Button onClick={() => toast.info(t("recordActions"))} variant="outline" className="ml-auto hidden h-9 rounded-lg border-slate-200 text-xs sm:flex"><MoreHorizontal className="mr-2 h-4 w-4" /> {t("recordActions")}</Button></div>
      <div className="record-facts"><div><span>Age</span><strong>{patient.age || "Not recorded"}</strong></div><div><span>Sex</span><strong>{patient.sex || "Not recorded"}</strong></div><div><span>Diabetes context</span><strong>{patient.type2 ? "Type 2 recorded" : patient.type1 ? "Type 1 recorded" : patient.gdm ? "GDM recorded" : "Not specified"}</strong></div><div><span>Identified by</span><strong>{patient.identifyBy || "Not recorded"}</strong></div><div><span>Observations</span><strong>{patient.observationCount.toLocaleString()}</strong></div></div>
    </header>

    <section className="record-kpi-grid" aria-label="Record summary metrics"><Kpi icon={ClipboardList} label="Recorded observations" value={patient.observationCount.toLocaleString()} helper="Source-preserved values" tone="navy" /><Kpi icon={Flag} label="Baseline flags" value={`${recordedFlags}/4`} helper="Fields with a value" tone="sage" /><Kpi icon={HeartPulse} label="Wound assessments" value="0" helper="No wound entity attached" tone="terracotta" /><Kpi icon={CalendarClock} label="Review status" value="Review" helper="Clinical confirmation needed" tone="amber" /></section>

    <section className="record-safety"><div className="record-safety-icon"><Info className="h-4 w-4" /></div><div><p><strong>Imported baseline requires clinical confirmation.</strong> Values below are preserved from the source workbook and are not a diagnosis or treatment recommendation.</p><span>Review source context before using this record in care decisions.</span></div><Button onClick={() => toast.info(`Source: ${patient.sourceFilename}, row ${patient.sourceRowNumber}`)} variant="ghost" className="ml-auto hidden h-8 shrink-0 rounded-lg px-2 text-xs text-[#4f7463] sm:block">View provenance</Button></section>

    <nav className="record-tabs" aria-label={t("patientRecords")}>{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item === "Overview" ? t("overview") : item === "Observations" ? t("observations") : item === "Wounds" ? t("woundProgress") : item === "Timeline" ? t("timeline") : t("auditTrail")}{item === "Observations" && <span>{patient.observationCount.toLocaleString()}</span>}</button>)}</nav>

    {tab === "Overview" && <div className="record-grid"><section className="record-section panel-card"><SectionHeading kicker="Current context" title="What needs attention" icon={Flag} /><div className="record-review-list"><ReviewRow icon={ShieldAlert} title="Imported source not clinically verified" detail="Confirm the source context before using these values in patient care." priority="Review" tone="amber" /><ReviewRow icon={CalendarClock} title="No wound assessment on record" detail="Wound status is not available in this imported dataset." priority="Info" /></div></section><section className="record-section panel-card"><SectionHeading kicker="Baseline flags" title="Recorded diabetes context" icon={Activity} /><div className="context-grid"><ContextValue label="Type 1 indicator" value={patient.type1} /><ContextValue label="Type 2 indicator" value={patient.type2} /><ContextValue label="Gestational indicator" value={patient.gdm} /><ContextValue label="Onset field" value={patient.dmOnset} /></div><p className="record-footnote">The source dictionary defines these fields as recorded indicators. The view does not interpret them as a new diagnosis.</p></section><section className="record-section panel-card record-section-wide"><div className="record-section-heading"><div><p className="record-kicker">Latest recorded activity</p><h2>Observation history</h2><p className="record-section-description">Select a row to inspect its source field, value, and period.</p></div><Button onClick={() => setTab("Observations")} variant="ghost" className="h-8 rounded-lg px-2 text-xs font-bold text-[#4f7463]">View all <ChevronDown className="ml-1 h-3.5 w-3.5 -rotate-90" /></Button></div><ObservationList observations={observationRows.slice(0, 6)} loading={observations.isLoading} onSelect={setSelectedObservation} /></section><section className="record-section panel-card"><SectionHeading kicker="Wound care" title="Wound progress" icon={HeartPulse} /><EmptyState icon={ImageOff} title="No wound record available" description="This imported record contains diabetes observations but no wound assessments, photographs, or measurements." /></section><section className="record-section panel-card"><SectionHeading kicker="Care team" title="Assigned people" icon={UserRound} /><EmptyState icon={UserRound} title="No care-team assignment" description="The source workbook does not include an assigned nurse, clinician, or service line." /></section></div>}

    {tab === "Observations" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Clinical observations</p><h2>Source-preserved history</h2><p className="record-section-description">Values retain their source field, period, and numeric or text form. This view does not infer units or reference ranges.</p></div><Button onClick={() => toast.info("Date filtering will use observation dates once the source provides them.")} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><CalendarClock className="mr-2 h-3.5 w-3.5" /> Date range <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><ObservationList observations={observationRows} loading={observations.isLoading} onSelect={setSelectedObservation} /></section>}

    {tab === "Wounds" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Wound progress</p><h2>Multiple-wound workspace</h2><p className="record-section-description">Track location, classification, dimensions, tissue, drainage, pain, infection indicators, treatment, media, and assessments here.</p></div><Button onClick={() => toast.info("Wound assessments require the governed wound entity and clinical permissions.")} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Ruler className="mr-2 h-3.5 w-3.5" /> New assessment</Button></div><EmptyState icon={ImageOff} title="No wound record available" description="Wound measurements and photographs will appear here when a governed wound record is created." action="Review data requirements" /></section>}

    {tab === "Timeline" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Timeline</p><h2>Record history</h2><p className="record-section-description">The timeline currently includes import provenance and source-preserved observations.</p></div><Button onClick={() => toast.info("Custom timeline ranges will be enabled when source timestamps are available.")} variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Clock3 className="mr-2 h-3.5 w-3.5" /> Full history <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><div className="record-timeline"><TimelineItem imported title="Source imported" meta={`Workbook batch #${patient.importBatchId}`} detail={`${patient.observationCount.toLocaleString()} non-null observations associated with this record.`} />{observationRows.slice(0, 8).map((observation) => <TimelineItem key={observation.id} title={formatField(observation.dictionaryField)} meta={`Period ${observation.periodKey ?? "baseline"}`} detail={< >Source field <code>{observation.sourceColumn}</code> recorded for this imported cohort record.</>} />)}</div></section>}

    {tab === "Audit trail" && <section className="record-section panel-card"><SectionHeading kicker="Access and changes" title="Audit trail" icon={LockKeyhole} /><EmptyState icon={LockKeyhole} title="Audit events are not yet attached" description="The record view is protected by the current application session. Append-only access and amendment events will appear here when the audit entity is enabled." /></section>}

    {selectedObservation && <ObservationDrawer observation={selectedObservation} onClose={() => setSelectedObservation(null)} />}
  </div>;
}

function Kpi({ icon: Icon, label, value, helper, tone }: { icon: typeof Activity; label: string; value: string; helper: string; tone: "navy" | "sage" | "terracotta" | "amber" }) { return <div className="record-kpi panel-card"><div className={`metric-icon metric-icon-${tone}`}><Icon className="h-[17px] w-[17px]" /></div><div className="min-w-0"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>; }
function SectionHeading({ kicker, title, icon: Icon }: { kicker: string; title: string; icon: typeof Activity }) { return <div className="record-section-heading"><div><p className="record-kicker">{kicker}</p><h2>{title}</h2></div><Icon className="h-4 w-4 text-slate-300" /></div>; }
function ContextValue({ label, value }: { label: string; value: string | number | null | undefined }) { return <div><span>{label}</span><strong>{value || "Not recorded"}</strong></div>; }
function ReviewRow({ icon: Icon, title, detail, priority, tone }: { icon: typeof ShieldAlert; title: string; detail: string; priority: string; tone?: "amber" }) { return <div className={`review-row ${tone === "amber" ? "review-row-amber" : ""}`}><div className="review-row-icon"><Icon className="h-4 w-4" /></div><div><strong>{title}</strong><p>{detail}</p></div><span className={`review-priority ${tone ? "" : "neutral"}`}>{priority}</span></div>; }
function ObservationList({ observations, loading, onSelect }: { observations: ObservationRow[]; loading: boolean; onSelect: (observation: ObservationRow) => void }) { if (loading) return <div className="observation-loading"><div /><div /><div /></div>; if (observations.length === 0) return <EmptyState icon={ClipboardList} title="No observations in this view" description="Confirm that the source record has been imported." />; return <div className="observation-list">{observations.map((observation) => <button className="observation-row" key={observation.id} onClick={() => onSelect(observation)}><div className="observation-icon"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{formatField(observation.dictionaryField)}</strong><span className="observation-source">{observation.sourceColumn}</span></div><p>Period {observation.periodKey ?? "baseline"} · Imported source value</p></div><div className="observation-value">{observation.valueNumber ?? observation.valueText ?? "Not recorded"}</div><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></button>)}</div>; }
function TimelineItem({ imported, title, meta, detail }: { imported?: boolean; title: string; meta: string; detail: React.ReactNode }) { return <div className="record-timeline-item"><div className={`record-timeline-marker ${imported ? "imported" : ""}`}><Activity className="h-3.5 w-3.5" /></div><div><div className="record-timeline-meta"><span>{title}</span><time>{meta}</time></div><p>{detail}</p></div></div>; }
function ObservationDrawer({ observation, onClose }: { observation: ObservationRow; onClose: () => void }) { return <div className="record-drawer-backdrop" role="presentation" onClick={onClose}><aside className="record-drawer" role="dialog" aria-modal="true" aria-labelledby="observation-drawer-title" onClick={(event) => event.stopPropagation()}><div className="record-drawer-head"><div><p className="record-kicker">Observation detail</p><h2 id="observation-drawer-title">{formatField(observation.dictionaryField)}</h2></div><button onClick={onClose} aria-label="Close observation detail" className="record-drawer-close"><X className="h-4 w-4" /></button></div><div className="record-drawer-value"><span>Source value</span><strong>{observation.valueNumber ?? observation.valueText ?? "Not recorded"}</strong></div><dl className="record-drawer-fields"><div><dt>Source column</dt><dd>{observation.sourceColumn}</dd></div><div><dt>Dictionary field</dt><dd>{observation.dictionaryField}</dd></div><div><dt>Period key</dt><dd>{observation.periodKey ?? "Baseline"}</dd></div><div><dt>Record handling</dt><dd>Preserved from import</dd></div></dl><div className="record-drawer-note"><FileText className="h-4 w-4" /><p>Units, reference ranges, author, notes, and related media are not present in the current source record.</p></div></aside></div>; }
