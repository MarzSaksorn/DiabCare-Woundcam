import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
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
  Pill,
  Ruler,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

const tabs = ["Overview", "Observations", "Wounds", "Timeline", "Audit trail"] as const;
type Tab = (typeof tabs)[number];

function formatField(field: string) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof ImageOff; title: string; description: string; action?: string }) {
  return <div className="record-empty-state"><div className="record-empty-icon"><Icon className="h-5 w-5" /></div><h3>{title}</h3><p>{description}</p>{action && <Button variant="outline" className="mt-4 h-9 rounded-lg border-slate-200 text-xs text-slate-600">{action}</Button>}</div>;
}

export default function PatientRecord() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/patients/:id");
  const patientId = Number(params?.id ?? 0);
  const [tab, setTab] = useState<Tab>("Overview");
  const detail = trpc.diabetes.detail.useQuery({ patientId }, { enabled: patientId > 0 });
  const observations = trpc.diabetes.observations.useQuery({ patientId, limit: 24 }, { enabled: patientId > 0 });
  const patient = detail.data;
  const sourceLabel = patient ? `Imported cohort record #${patient.sourceRowNumber - 1}` : "Patient record";

  if (detail.isLoading) return <div className="record-page"><div className="record-skeleton"><div /><div /><div /><div /></div></div>;
  if (detail.error || !patient) return <div className="record-page"><div className="record-error"><ShieldAlert className="h-6 w-6 text-[#c86b52]" /><div><h1>Record unavailable</h1><p>This record cannot be displayed in your current care-team scope or no longer exists.</p><Button onClick={() => setLocation("/patients")} variant="outline" className="mt-4 h-9 rounded-lg">Back to patients</Button></div></div></div>;

  return <div className="record-page">
    <div className="record-topbar"><Link href="/patients" className="record-back"><ArrowLeft className="h-4 w-4" /> Patients</Link><div className="record-topbar-meta"><span><LockKeyhole className="h-3.5 w-3.5" /> Scoped clinical view</span><span className="hidden sm:inline">Updated from local database</span></div></div>

    <header className="record-header panel-card">
      <div className="record-identity"><div className="record-avatar"><UserRound className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1>{sourceLabel}</h1><span className="record-state record-state-imported"><span /> Imported / unverified</span></div><p className="record-subtitle">Internal record ID {patient.id} · Source row {patient.sourceRowNumber} · {patient.sourceFilename}</p></div><Button variant="outline" className="ml-auto hidden h-9 rounded-lg border-slate-200 text-xs sm:flex"><MoreHorizontal className="mr-2 h-4 w-4" /> Record actions</Button></div>
      <div className="record-facts"><div><span>Age</span><strong>{patient.age || "Not recorded"}</strong></div><div><span>Sex</span><strong>{patient.sex || "Not recorded"}</strong></div><div><span>Diabetes context</span><strong>{patient.type2 ? "Type 2 recorded" : patient.type1 ? "Type 1 recorded" : patient.gdm ? "GDM recorded" : "Not specified"}</strong></div><div><span>Identified by</span><strong>{patient.identifyBy || "Not recorded"}</strong></div><div><span>Observations</span><strong>{patient.observationCount.toLocaleString()}</strong></div></div>
    </header>

    <section className="record-safety"><div className="record-safety-icon"><Info className="h-4 w-4" /></div><div><p><strong>Imported baseline requires clinical confirmation.</strong> Values below are preserved from the source workbook and are not a diagnosis or treatment recommendation.</p><span>Review source context before using this record in care decisions.</span></div><Button variant="ghost" className="ml-auto hidden h-8 shrink-0 rounded-lg px-2 text-xs text-[#4f7463] sm:block">View provenance</Button></section>

    <nav className="record-tabs" aria-label="Patient record sections">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}{item === "Observations" && <span>{patient.observationCount.toLocaleString()}</span>}</button>)}</nav>

    {tab === "Overview" && <div className="record-grid"><section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Current context</p><h2>What needs attention</h2></div><Flag className="h-4 w-4 text-slate-300" /></div><div className="record-review-list"><div className="review-row review-row-amber"><div className="review-row-icon"><ShieldAlert className="h-4 w-4" /></div><div><strong>Imported source not clinically verified</strong><p>Confirm the source context before using these values in patient care.</p></div><span className="review-priority">Review</span></div><div className="review-row"><div className="review-row-icon"><CalendarClock className="h-4 w-4" /></div><div><strong>No wound assessment on record</strong><p>Wound status is not available in this imported dataset.</p></div><span className="review-priority neutral">Info</span></div></div></section><section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Baseline flags</p><h2>Recorded diabetes context</h2></div><Activity className="h-4 w-4 text-slate-300" /></div><div className="context-grid"><div><span>Type 1 indicator</span><strong>{patient.type1}</strong></div><div><span>Type 2 indicator</span><strong>{patient.type2}</strong></div><div><span>Gestational indicator</span><strong>{patient.gdm}</strong></div><div><span>Onset field</span><strong>{patient.dmOnset}</strong></div></div><p className="record-footnote">The source dictionary defines these fields as recorded indicators. They are not interpreted here as a new diagnosis.</p></section><section className="record-section panel-card record-section-wide"><div className="record-section-heading"><div><p className="record-kicker">Latest recorded activity</p><h2>Observation history</h2></div><Button onClick={() => setTab("Observations")} variant="ghost" className="h-8 rounded-lg px-2 text-xs font-bold text-[#4f7463]">View all <ChevronDown className="ml-1 h-3.5 w-3.5 -rotate-90" /></Button></div><ObservationList observations={(observations.data ?? []).slice(0, 6)} loading={observations.isLoading} /></section><section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Wound care</p><h2>Wound progress</h2></div><HeartPulse className="h-4 w-4 text-slate-300" /></div><EmptyState icon={ImageOff} title="No wound record available" description="This imported record contains diabetes observations but no wound assessments, photographs, or measurements." /></section></div>}

    {tab === "Observations" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Clinical observations</p><h2>Source-preserved history</h2><p className="record-section-description">Showing the latest imported observations. Values retain their source field, period, and numeric/text form.</p></div><Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><CalendarClock className="mr-2 h-3.5 w-3.5" /> Date range <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><ObservationList observations={observations.data ?? []} loading={observations.isLoading} /></section>}

    {tab === "Wounds" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Wound progress</p><h2>Multiple-wound workspace</h2></div><Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Ruler className="mr-2 h-3.5 w-3.5" /> New assessment</Button></div><EmptyState icon={ImageOff} title="No wound record available" description="Wound location, classification, dimensions, tissue, drainage, pain, treatment, photographs, and assessments will appear here when a governed wound record is created." action="Review data requirements" /></section>}

    {tab === "Timeline" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Timeline</p><h2>Record history</h2></div><Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs"><Clock3 className="mr-2 h-3.5 w-3.5" /> Full history <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button></div><div className="record-timeline"><div className="record-timeline-item"><div className="record-timeline-marker imported"><ClipboardList className="h-3.5 w-3.5" /></div><div><div className="record-timeline-meta"><span>Source imported</span><time>Workbook batch #{patient.importBatchId}</time></div><p>{patient.observationCount.toLocaleString()} non-null observations associated with this record.</p></div></div>{(observations.data ?? []).slice(0, 8).map((observation) => <div className="record-timeline-item" key={observation.id}><div className="record-timeline-marker"><Activity className="h-3.5 w-3.5" /></div><div><div className="record-timeline-meta"><span>{formatField(observation.dictionaryField)}</span><time>Period {observation.periodKey ?? "baseline"}</time></div><p>Source field <code>{observation.sourceColumn}</code> recorded for this imported cohort record.</p></div></div>)}</div></section>}

    {tab === "Audit trail" && <section className="record-section panel-card"><div className="record-section-heading"><div><p className="record-kicker">Access and changes</p><h2>Audit trail</h2></div><LockKeyhole className="h-4 w-4 text-slate-300" /></div><EmptyState icon={LockKeyhole} title="Audit events are not yet attached" description="The record view is protected by the current application session. Append-only clinical access and amendment events will appear here when the audit entity is enabled." /></section>}
  </div>;
}

function ObservationList({ observations, loading }: { observations: Array<{ id: number; sourceColumn: string; dictionaryField: string; periodKey: number | null; valueNumber: string | null; valueText: string | null }>; loading: boolean }) {
  if (loading) return <div className="observation-loading"><div /><div /><div /></div>;
  if (observations.length === 0) return <EmptyState icon={ClipboardList} title="No observations in this view" description="Try a wider date range or confirm that the source record has been imported." />;
  return <div className="observation-list">{observations.map((observation) => <button className="observation-row" key={observation.id}><div className="observation-icon"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{formatField(observation.dictionaryField)}</strong><span className="observation-source">{observation.sourceColumn}</span></div><p>Period {observation.periodKey ?? "baseline"} · Imported source value</p></div><div className="observation-value">{observation.valueNumber ?? observation.valueText ?? "Not recorded"}</div><ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" /></button>)}</div>;
}
