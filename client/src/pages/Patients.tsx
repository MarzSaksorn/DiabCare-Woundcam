import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Filter, RefreshCw, Search, ShieldAlert, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/locale";

type FilterState = "all" | "review" | "complete" | "imported";
type DiabetesFilter = "all" | "type1" | "type2" | "gdm" | "none";
type SexFilter = "all" | "FEMALE" | "MALE";
type PatientListRow = {
  id: number;
  recordKind: "imported" | "registered";
  sourceRowNumber?: number;
  patientCode?: string;
  displayName?: string | null;
  registrationLocation?: string;
  age: string | number | null;
  sex: "FEMALE" | "MALE";
  identifyBy: string;
  type1: number;
  type2: number;
  gdm: number;
  observationCount: number;
  importedPatientId?: number | null;
  createdAt: Date | string | null;
};
const PAGE_SIZE = 12;

function PatientsPageContent() {
  const patientsQuery = trpc.diabetes.patients.useQuery({ limit: 100 });
  const registeredPatientsQuery = trpc.diabetes.registeredPatients.useQuery({ limit: 100 });
  const summaryQuery = trpc.diabetes.summary.useQuery();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterState>("all");
  const [diabetesFilter, setDiabetesFilter] = useState<DiabetesFilter>("all");
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const { t, language } = useLanguage();

  const rows = useMemo<PatientListRow[]>(() => {
    const normalized = query.trim().toLowerCase();
    const linkedImportedIds = new Set((registeredPatientsQuery.data ?? []).map((patient) => patient.importedPatientId).filter((id): id is number => Boolean(id)));
    const importedRows: PatientListRow[] = (patientsQuery.data ?? []).filter((patient) => !linkedImportedIds.has(patient.id)).map((patient) => ({ ...patient, recordKind: "imported" as const }));
    const registeredRows: PatientListRow[] = (registeredPatientsQuery.data ?? []).map((patient) => ({
      ...patient,
      recordKind: "registered" as const,
      identifyBy: patient.identifyBy,
      observationCount: patient.observationCount,
      age: patient.age,
    }));
    return [...importedRows, ...registeredRows].filter((patient) => {
      const recordLabel = patient.recordKind === "registered" ? `${patient.patientCode} ${patient.displayName ?? ""} ${patient.registrationLocation ?? ""}` : `imported cohort record ${(patient.sourceRowNumber ?? 1) - 1}`;
      const matchesQuery = !normalized || [
        recordLabel,
        patient.id,
        patient.age,
        patient.sex,
        patient.identifyBy,
      ].join(" ").toLowerCase().includes(normalized);
      const isComplete = Boolean(patient.age && patient.sex && patient.identifyBy);
      const matchesStatus = filter === "all" || (filter === "imported" && patient.recordKind === "imported") || (filter === "complete" && isComplete) || (filter === "review" && !isComplete);
      const context = patient.type2 ? "type2" : patient.type1 ? "type1" : patient.gdm ? "gdm" : "none";
      const matchesDiabetes = diabetesFilter === "all" || context === diabetesFilter;
      const matchesSex = sexFilter === "all" || patient.sex === sexFilter;
      return matchesQuery && matchesStatus && matchesDiabetes && matchesSex;
    });
  }, [diabetesFilter, filter, patientsQuery.data, query, registeredPatientsQuery.data, sexFilter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const totalRecords = (patientsQuery.data?.length ?? 0) + (registeredPatientsQuery.data?.length ?? 0);
  const totalObservations = summaryQuery.data?.observationCount ?? patientsQuery.data?.reduce((sum, patient) => sum + patient.observationCount, 0) ?? 0;

  function updateQuery(value: string) { setQuery(value); setPage(1); }
  function updateFilter(value: FilterState) { setFilter(value); setPage(1); }
  function resetFilters() {
    setQuery("");
    setFilter("all");
    setDiabetesFilter("all");
    setSexFilter("all");
    setPage(1);
  }

  return <DashboardLayout><div className="mx-auto w-full max-w-[1500px] space-y-6 px-1 py-1 sm:px-3 lg:px-6 lg:py-4">
    <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"><span className="h-2 w-2 rounded-full bg-[#6d9681]" /> {t("careWorkspace")} <span className="text-slate-300">/</span> {t("patientRecords")}</div><h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-[#132238] sm:text-5xl">{t("patients")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{t("patientsPageDescription")}</p></div><div className="flex flex-wrap items-center gap-2"><Button onClick={() => { patientsQuery.refetch(); registeredPatientsQuery.refetch(); }} variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-slate-600"><RefreshCw className={`mr-2 h-4 w-4 ${patientsQuery.isFetching || registeredPatientsQuery.isFetching ? "animate-spin" : ""}`} /> {t("refresh")}</Button><Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-slate-600"><ClipboardList className="mr-2 h-4 w-4" /> {t("exportMetadata")}</Button><Link href="/patients/new" className="inline-flex h-10 items-center rounded-xl bg-[#132238] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#203552]"><Users className="mr-2 h-4 w-4" /> {t("registerPatient")}</Link></div></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Users} label={t("recordsInScope")} value={totalRecords} helper={t("localDatabase")} tone="navy" /><Metric icon={ShieldAlert} label={t("needsReview")} value={patientsQuery.data ? patientsQuery.data.length : "—"} helper={t("importedUnverified")} tone="amber" /><Metric icon={ClipboardList} label={t("observations")} value={formatNumber(totalObservations, language)} helper={t("sourcePreservedValues")} tone="sage" /><Metric icon={CheckCircle2} label={t("baselineComplete")} value={totalRecords} helper={t("fieldsWithValue")} tone="sage" /></section>

    <section className="panel-card overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[23px] tracking-[-0.03em] text-[#132238]">{t("patientRecords")}</h2><Badge className="rounded-full bg-[#eef3f0] text-[#4f7463] hover:bg-[#eef3f0]">{rows.length} {t("matching")}</Badge></div><p className="mt-1 text-sm text-slate-400">{t("sourcePreservedBaseline")}</p></div><div className="flex w-full gap-2 lg:w-auto"><div className="relative min-w-0 flex-1 lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t("searchRecords")} aria-label={t("searchRecords")} className="h-10 rounded-lg border-slate-200 bg-white pl-9 pr-9 text-sm" />{query && <button onClick={() => updateQuery("")} aria-label={t("clearSearch")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}</div><Button type="button" variant="outline" aria-expanded={showFilters} aria-controls="patient-record-filters" onClick={() => setShowFilters((value) => !value)} className="h-10 rounded-lg border-slate-200 px-3 text-slate-500"><Filter className="mr-2 h-4 w-4" /> {t("filters")}</Button></div></div>

      {showFilters && <div id="patient-record-filters" className="grid gap-3 border-b border-slate-100 bg-[#fbfcfb] px-5 py-4 sm:grid-cols-3 sm:px-6"><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span>{t("reviewStatus")}</span><select value={filter} onChange={(event) => updateFilter(event.target.value as FilterState)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9681]"><option value="all">{t("allRecords")}</option><option value="review">{t("needsReview")}</option><option value="complete">{t("baselineComplete")}</option><option value="imported">{t("imported")}</option></select></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span>{t("diabetesContext")}</span><select value={diabetesFilter} onChange={(event) => { setDiabetesFilter(event.target.value as DiabetesFilter); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9681]"><option value="all">{t("allRecords")}</option><option value="type1">{t("type1")}</option><option value="type2">{t("type2")}</option><option value="gdm">{t("gdm")}</option><option value="none">{t("notSpecified")}</option></select></label><label className="grid gap-1.5 text-xs font-semibold text-slate-500"><span>{t("sex")}</span><select value={sexFilter} onChange={(event) => { setSexFilter(event.target.value as SexFilter); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9681]"><option value="all">{t("allRecords")}</option><option value="FEMALE">{t("female")}</option><option value="MALE">{t("male")}</option></select></label></div>}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">{([['all', t("allRecords")], ['review', t("needsReview")], ['complete', t("baselineComplete")], ['imported', t("imported")]] as const).map(([value, label]) => <button key={value} onClick={() => updateFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === value ? "bg-[#132238] text-white" : "bg-[#f1f4f2] text-slate-500 hover:bg-[#e7efeb] hover:text-[#25354a]"}`}>{label}</button>)}<span className="ml-auto text-[11px] text-slate-400">{t("localDatabase")} · {summaryQuery.data?.batch?.createdAt ? formatDate(summaryQuery.data.batch.createdAt, language) : "—"}</span></div>

      {patientsQuery.isLoading && <div className="space-y-2 p-6">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#f1f4f2]" />)}</div>}
      {patientsQuery.error && <div className="flex items-start gap-3 px-6 py-12"><AlertTriangle className="mt-0.5 h-5 w-5 text-[#c86b52]" /><div><h3 className="text-sm font-bold text-[#25354a]">{t("patientsLoadError")}</h3><p className="mt-1 text-xs text-slate-400">{t("patientsLoadErrorDetail")}</p><Button onClick={() => patientsQuery.refetch()} variant="outline" className="mt-4 h-9 rounded-lg text-xs">{t("tryAgain")}</Button></div></div>}
      {!patientsQuery.isLoading && !patientsQuery.error && visibleRows.length === 0 && <div className="flex flex-col items-center px-6 py-16 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f4f2] text-slate-400"><Search className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-bold text-[#25354a]">{t("noRecordsMatch")}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{t("noRecordsMatchDetail")}</p><Button onClick={resetFilters} variant="ghost" className="mt-3 h-8 text-xs text-[#4f7463]">{t("resetView")}</Button></div>}
      {!patientsQuery.isLoading && !patientsQuery.error && visibleRows.length > 0 && <><div className="hidden grid-cols-[1.45fr_.75fr_.8fr_1fr_.75fr_.65fr_auto] gap-4 border-b border-slate-100 bg-[#fbfcfb] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:grid"><span>{t("record")}</span><span>{t("ageSex")}</span><span>{t("diabetes")}</span><span>{t("dataState")}</span><span>{t("observations")}</span><span>{t("updated")}</span><span /></div><div className="divide-y divide-slate-100">{visibleRows.map((patient) => <PatientListRow key={`${patient.recordKind}-${patient.id}`} patient={patient} language={language} t={t} />)}</div><div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-400">{t("showing")} {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} {t("of")} {rows.length} {t("records")}</p><div className="flex items-center gap-2"><Button variant="outline" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-8 rounded-lg border-slate-200 px-2 text-xs"><ChevronLeft className="h-3.5 w-3.5" /> {t("previous")}</Button><span className="min-w-16 text-center text-xs font-semibold text-slate-500">{t("page")} {safePage} / {pageCount}</span><Button variant="outline" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="h-8 rounded-lg border-slate-200 px-2 text-xs">{t("next")} <ChevronRight className="h-3.5 w-3.5" /></Button></div></div></>}
    </section>

    <section className="flex items-start gap-3 rounded-xl border border-[#e6ece8] bg-[#f7faf8] px-4 py-3"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#6d9681]" /><p className="text-xs leading-5 text-slate-500"><strong className="text-[#25354a]">{t("decisionSupport")} </strong> {t("importedValuesCareNote")}</p></section>
  </div></DashboardLayout>;
}

function Metric({ icon: Icon, label, value, helper, tone }: { icon: typeof Users; label: string; value: number | string; helper: string; tone: "navy" | "amber" | "sage" }) {
  return <div className="metric-card"><div className={`metric-icon metric-icon-${tone}`}><Icon className="h-[18px] w-[18px]" /></div><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 font-display text-3xl tracking-[-0.04em] text-[#132238]">{value}</p><p className="mt-1 text-xs text-slate-400">{helper}</p></div><ArrowRight className="ml-auto mt-1 h-4 w-4 text-slate-300" /></div>;
}

function PatientListRow({ patient, language, t }: { patient: PatientListRow; language: "en" | "th"; t: (key: string) => string }) {
  const isRegistered = patient.recordKind === "registered";
  const content = <><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf1f5] text-[#4f647d]"><Users className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#25354a]">{isRegistered ? (patient.displayName || patient.patientCode) : `${t("importedCohortRecord")} #${(patient.sourceRowNumber ?? 1) - 1}`}</p><p className="mt-0.5 truncate text-xs text-slate-400">{isRegistered ? `${patient.patientCode} · ${patient.registrationLocation}` : `${t("internalId")} ${patient.id} · ${t("sourceRow")} ${patient.sourceRowNumber}`}</p></div></div><div className="text-sm text-slate-600"><span className="lg:hidden text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{t("ageSex")} · </span>{patient.age || t("notRecorded")} · {patient.sex}</div><div className="text-sm text-slate-600"><span className="lg:hidden text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{t("context")} · </span>{patient.type2 ? t("type2") : patient.type1 ? t("type1") : patient.gdm ? t("gdm") : t("notSpecified")}</div><div><span className={`status-badge ${isRegistered ? "status-complete" : "status-review"}`}><span className="status-dot" />{isRegistered ? t("registeredPatients") : t("importedUnverified")}</span></div><div className="text-sm font-semibold text-[#25354a]"><span className="lg:hidden text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{t("observations")} · </span>{formatNumber(patient.observationCount, language)}</div><div className="text-xs text-slate-400"><span className="lg:hidden text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{t("updated")} · </span>{patient.createdAt ? formatDate(patient.createdAt, language) : "—"}</div><ArrowRight className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 lg:block" /></>;
  if (isRegistered) return <Link href={`/patients/registered/${patient.id}`} className="group grid gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fbfcfb] sm:px-6 lg:grid-cols-[1.45fr_.75fr_.8fr_1fr_.75fr_.65fr_auto] lg:items-center lg:gap-4">{content}</Link>;
  return <Link href={`/patients/${patient.id}`} className="group grid gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fbfcfb] sm:px-6 lg:grid-cols-[1.45fr_.75fr_.8fr_1fr_.75fr_.65fr_auto] lg:items-center lg:gap-4">{content}</Link>;
}

export default PatientsPageContent;
