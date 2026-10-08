import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FilePlus2,
  Filter,
  HeartPulse,
  ImagePlus,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getReviewPriority } from "@shared/dashboard";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMeasurementPair, formatNumber, formatPercent } from "@/lib/locale";

const patients = [
  { id: "DC-1048", name: "María Santos", age: 64, wound: "Left plantar foot", status: "Urgent", stage: "Stage 3", trend: "Needs review", updated: "Today, 08:42", initials: "MS", tone: "terracotta" },
  { id: "DC-1029", name: "Robert Chen", age: 58, wound: "Right great toe", status: "Review due", stage: "Stage 2", trend: "Stable", updated: "Yesterday, 16:10", initials: "RC", tone: "amber" },
  { id: "DC-0984", name: "Lena Williams", age: 71, wound: "Right heel", status: "Healing", stage: "Stage 1", trend: "Improving", updated: "Sep 15, 11:24", initials: "LW", tone: "sage" },
  { id: "DC-0967", name: "Daniel Okafor", age: 52, wound: "Left lateral ankle", status: "Healing", stage: "Stage 2", trend: "Improving", updated: "Sep 14, 14:50", initials: "DO", tone: "sage" },
];

const activity = [
  { time: "08:42", title: "Assessment flagged for review", detail: "María Santos · Left plantar foot", tone: "urgent" },
  { time: "08:15", title: "Follow-up completed", detail: "Lena Williams · Wound measurements updated", tone: "positive" },
  { time: "Yesterday", title: "New wound image added", detail: "Robert Chen · Right great toe", tone: "neutral" },
];

function StatusBadge({ status }: { status: string }) {
  const tone = status === "Urgent" ? "urgent" : status === "Review due" ? "review" : "healing";
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{status}</span>;
}

type HomeProps = { demoMode?: boolean; params?: unknown };

export default function Home({ demoMode = false }: HomeProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const dashboardMetrics = [
    { label: language === "th" ? "แผลที่กำลังดูแล" : "Active wounds", value: formatNumber(24, language), helper: language === "th" ? "+3 เดือนนี้" : "+3 this month", context: language === "th" ? "จากผู้ป่วย 18 ราย" : "Across 18 patients", icon: Activity, tone: "navy" },
    { label: language === "th" ? "ต้องตรวจสอบ" : "Need review", value: formatNumber(7, language, { minimumIntegerDigits: 2 }), helper: language === "th" ? "ความสำคัญสูง 2 รายการ" : "2 high priority", context: language === "th" ? "29% ของแผลที่กำลังดูแล" : "29% of active wounds", icon: CircleAlert, tone: "terracotta" },
    { label: language === "th" ? "แนวโน้มการหาย" : "Healing trend", value: formatPercent(68, language), helper: language === "th" ? "+8% จากเดือนก่อน" : "+8% vs last month", context: language === "th" ? "เป้าหมาย ≥ 65%" : "Target ≥ 65%", icon: HeartPulse, tone: "sage" },
    { label: language === "th" ? "ครบกำหนดติดตาม" : "Follow-ups due", value: formatNumber(5, language, { minimumIntegerDigits: 2 }), helper: language === "th" ? "ภายใน 7 วัน" : "Next 7 days", context: language === "th" ? "เกินกำหนด 1 รายการ" : "1 overdue", icon: CalendarDays, tone: "amber" },
  ];
  const diabetesSummary = trpc.diabetes.summary.useQuery(undefined, { enabled: Boolean(user) });
  const diabetesPatients = trpc.diabetes.patients.useQuery({ limit: 100 }, { enabled: Boolean(user) });
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<(typeof patients)[number] | null>(patients[0]);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredPatients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return patients;
    return patients.filter((patient) => `${patient.name} ${patient.id} ${patient.wound}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <DashboardLayout demoMode={demoMode}>
      <div className="mx-auto w-full max-w-[1500px] space-y-7 px-1 py-1 sm:px-3 lg:px-6 lg:py-4">
        <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#6d9681]" /> Riverside Community Hospital <span className="text-slate-300">/</span> Wound care
            </div>
            <h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-[#132238] sm:text-5xl">{language === "th" ? "สวัสดีตอนเช้า คุณหมอลี" : "Good morning, Dr. Lee"}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{language === "th" ? "มุมมองทีมดูแลสำหรับวันนี้ มีผู้ป่วยหนึ่งรายที่ควรตรวจสอบทันที และมีการติดตามห้ารายการภายในสัปดาห์นี้" : "Here is the care team view for today. One patient needs immediate review and five follow-ups are coming due this week."}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-600 shadow-sm hover:bg-slate-50"><Bell className="mr-2 h-4 w-4" /> {language === "th" ? "การแจ้งเตือน" : "Notifications"} <span className="ml-1 rounded-full bg-[#c86b52] px-1.5 py-0.5 text-[10px] font-bold text-white">3</span></Button>
            <Button onClick={() => { setSaved(false); setAssessmentOpen(true); }} className="h-11 rounded-xl bg-[#132238] px-4 text-white shadow-[0_8px_20px_rgba(19,34,56,.16)] hover:bg-[#203552]"><Plus className="mr-2 h-4 w-4" /> {language === "th" ? "สร้างการประเมิน" : "New assessment"}</Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardMetrics.map(({ label, value, helper, context, icon: Icon, tone }) => (
            <div key={label} className="metric-card">
              <div className={`metric-icon metric-icon-${tone}`}><Icon className="h-[18px] w-[18px]" /></div>
              <div className="min-w-0"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 font-display text-3xl tracking-[-0.04em] text-[#132238]">{value}</p><p className="mt-1 text-xs text-slate-400">{helper}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">{context}</p></div>
              <ArrowRight className="ml-auto mt-1 h-4 w-4 text-slate-300" />
            </div>
          ))}
        </section>

        <section className="panel-card grid gap-6 overflow-hidden px-5 py-5 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t("carePerformance")}</p><h2 className="mt-1 font-display text-[23px] tracking-[-0.03em] text-[#132238]">{t("healingProgress")}</h2></div>
              <span className="rounded-full bg-[#edf5f0] px-2.5 py-1 text-[10px] font-bold text-[#4f7463]">{t("last30Days")}</span>
            </div>
            <div className="mt-5 flex items-end gap-4"><div><p className="font-display text-4xl tracking-[-0.05em] text-[#132238]">{formatPercent(68, language)}</p><p className="mt-1 text-xs text-slate-400">{language === "th" ? "แผลที่มีขนาดดีขึ้น" : "wounds with improving measurements"}</p></div><span className="mb-1 rounded-full bg-[#edf5f0] px-2 py-1 text-[10px] font-bold text-[#4f7463]">+8 {language === "th" ? "คะแนน" : "pts"}</span></div>
            <div className="mt-5 flex h-20 items-end gap-1.5" aria-label="Healing progress trend from 30 days ago to today">
              {[38, 42, 45, 43, 50, 53, 52, 57, 55, 61, 64, 68].map((height, index) => <div key={index} className="trend-bar" style={{ height: `${height}%` }} />)}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{language === "th" ? "30 วันที่แล้ว" : "30 days ago"}</span><span>{language === "th" ? "วันนี้" : "Today"}</span></div>
          </div>
          <div className="rounded-xl bg-[#f7faf8] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#25354a]">{t("reviewWorkload")}</p><span className="text-[10px] font-semibold text-slate-400">{t("thisWeek")}</span></div><div className="mt-4 space-y-3"><div className="workload-row"><span>{t("dueToday")}</span><strong>2</strong><div className="workload-track"><i className="w-[40%] bg-[#c86b52]" /></div></div><div className="workload-row"><span>{t("dueIn3Days")}</span><strong>3</strong><div className="workload-track"><i className="w-[60%] bg-[#d9a441]" /></div></div><div className="workload-row"><span>{t("onSchedule")}</span><strong>19</strong><div className="workload-track"><i className="w-[82%] bg-[#6d9681]" /></div></div></div><button className="mt-5 text-xs font-bold text-[#4f7463]">{t("viewWorkloadDetails")} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div>
        </section>

        <section className="panel-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[22px] tracking-[-0.03em] text-[#132238]">{t("importedDiabetesCohort")}</h2><Badge className="rounded-full bg-[#edf1f5] text-[#4f647d] hover:bg-[#edf1f5]">{t("databaseRecords")}</Badge></div><p className="mt-1 text-sm text-slate-400">Baseline fields from the approved workbook import. Source rows are shown instead of inferred patient identities.</p></div>
            <div className="text-left sm:text-right"><p className="text-xs font-bold text-[#25354a]">{diabetesSummary.data?.patientCount ?? "—"} patients</p><p className="mt-1 text-[11px] text-slate-400">{diabetesSummary.data?.observationCount?.toLocaleString() ?? "—"} observations</p></div>
          </div>
          {diabetesPatients.isLoading && <div className="px-6 py-10 text-sm text-slate-400">{t("loadingImportedRecords")}</div>}
          {diabetesPatients.error && <div className="px-6 py-10 text-sm text-slate-500">Database records require an authenticated care-team session.</div>}
          {!diabetesPatients.isLoading && !diabetesPatients.error && <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-[#fbfcfb] text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-6 py-3">Source row</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Sex</th><th className="px-4 py-3">Identify by</th><th className="px-4 py-3">Type 1</th><th className="px-4 py-3">Type 2</th><th className="px-4 py-3">GDM</th><th className="px-4 py-3">Observations</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{(diabetesPatients.data ?? []).slice(0, 8).map((patient) => <tr key={patient.id} className="text-sm text-[#25354a] hover:bg-[#fbfcfb]"><td className="px-6 py-3 font-semibold">Imported record #{patient.sourceRowNumber - 1}</td><td className="px-4 py-3 text-slate-600">{patient.age}</td><td className="px-4 py-3 text-slate-600">{patient.sex}</td><td className="px-4 py-3 text-slate-600">{patient.identifyBy}</td><td className="px-4 py-3 text-slate-600">{patient.type1}</td><td className="px-4 py-3 text-slate-600">{patient.type2}</td><td className="px-4 py-3 text-slate-600">{patient.gdm}</td><td className="px-4 py-3 text-slate-600">{patient.observationCount}</td><td className="px-4 py-3"><Link href={`/patients/${patient.id}`} className="text-xs font-bold text-[#4f7463]">Open</Link></td></tr>)}</tbody></table></div>}
          {!diabetesPatients.isLoading && !diabetesPatients.error && (diabetesPatients.data?.length ?? 0) > 8 && <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">Showing 8 of {diabetesPatients.data?.length} imported records. Use the Patients workspace for the full cohort.</div>}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="panel-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><div className="flex items-center gap-2"><h2 className="font-display text-[22px] tracking-[-0.03em] text-[#132238]">{t("patientOverview")}</h2><Badge className="rounded-full bg-[#eef3f0] text-[#4f7463] hover:bg-[#eef3f0]">24 active</Badge></div><p className="mt-1 text-sm text-slate-400">Track wound progress and prioritize your next review.</p></div>
              <div className="flex gap-2"><div className="relative min-w-0 flex-1 sm:w-52"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPatients")} className="h-10 rounded-lg border-slate-200 pl-9 text-sm" /></div><Button variant="outline" className="h-10 w-10 shrink-0 rounded-lg border-slate-200 p-0"><SlidersHorizontal className="h-4 w-4 text-slate-500" /></Button></div>
            </div>
            <div className="hidden grid-cols-[1.25fr_1.15fr_.8fr_.9fr_auto] gap-4 border-b border-slate-100 bg-[#fbfcfb] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 md:grid"><span>Patient</span><span>Wound location</span><span>Status</span><span>Last update</span><span /></div>
            <div className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <button key={patient.id} onClick={() => setSelectedPatient(patient)} className={`group grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fbfcfb] sm:px-6 md:grid-cols-[1.25fr_1.15fr_.8fr_.9fr_auto] md:items-center md:gap-4 ${selectedPatient?.id === patient.id ? "bg-[#f7faf8]" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10 shrink-0 rounded-xl"><AvatarFallback className={`bg-avatar-${patient.tone} text-xs font-bold`}>{patient.initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#25354a]">{patient.name}</p><p className="mt-0.5 text-xs text-slate-400">{patient.id} · {patient.age} yrs</p></div></div>
                  <div className="flex items-center justify-between gap-2 md:block"><div className="text-sm text-slate-600">{patient.wound}</div><div className="mt-0.5 text-xs text-slate-400">{patient.stage} · {patient.trend}</div></div>
                  <div><StatusBadge status={patient.status} /></div><div className="text-xs text-slate-400">{patient.updated}</div><ChevronRight className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 md:block" />
                </button>
              ))}
            </div>
            {filteredPatients.length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-400">No patients match “{query}”.</div>}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4"><p className="text-xs text-slate-400">Showing {filteredPatients.length} of 24 active patients</p><Button variant="ghost" className="h-8 rounded-lg px-2 text-xs font-semibold text-[#4f7463] hover:bg-[#eef3f0]">View all patients <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
          </section>

          <aside className="space-y-5">
            <section className="panel-card overflow-hidden"><div className="flex items-start justify-between px-5 pb-4 pt-5"><div><h2 className="font-display text-[21px] tracking-[-0.03em] text-[#132238]">{t("attentionRequired")}</h2><p className="mt-1 text-xs text-slate-400">Ranked by urgency and due date</p></div><span className="rounded-full bg-[#fff0ec] px-2 py-1 text-[11px] font-bold text-[#b85b45]">2 high priority</span></div><div className="space-y-1 px-3 pb-3"><button onClick={() => setSelectedPatient(patients[0])} className="attention-item border-l-[#c86b52]"><div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#c86b52]" /><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-[#25354a]">María Santos</p><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b85b45]">{getReviewPriority(patients[0].status as "Urgent")}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">Wound area increased 12% since last visit · review today</p></div><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" /></button><button onClick={() => setSelectedPatient(patients[1])} className="attention-item border-l-[#d9a441]"><div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#d9a441]" /><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-[#25354a]">Robert Chen</p><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9e762a]">{getReviewPriority(patients[1].status as "Review due")}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">Follow-up window closes tomorrow · stable</p></div><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" /></button></div><div className="border-t border-slate-100 px-5 py-3"><button className="text-xs font-bold text-[#4f7463]">Open review queue <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div></section>
            <section className="panel-card px-5 py-5"><div className="flex items-start justify-between"><div><h2 className="font-display text-[21px] tracking-[-0.03em] text-[#132238]">{t("recentActivity")}</h2><p className="mt-1 text-xs text-slate-400">{t("teamUpdates")}</p></div><Clock3 className="h-4 w-4 text-slate-300" /></div><div className="mt-5 space-y-5">{activity.map((item) => <div key={item.time} className="flex gap-3"><div className={`activity-line activity-${item.tone}`}><span /></div><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-[#25354a]">{item.title}</p><span className="shrink-0 text-[10px] text-slate-400">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p></div></div>)}</div></section>
          </aside>
        </div>

        <section className="panel-card grid gap-5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"><div className="flex items-start gap-4"><div className="rounded-xl bg-[#eef3f0] p-3 text-[#4f7463]"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-sm font-bold text-[#25354a]">{t("decisionSupport")}</p><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Woundcam highlights changes and review priorities from recorded observations. It does not replace clinical assessment, validated protocols, or patient-specific medical judgment.</p></div></div><Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs text-slate-500">{t("readClinicalNote")} <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></section>
      </div>

      {selectedPatient && <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><section className="panel-card px-5 py-5 sm:px-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-3"><Avatar className="h-12 w-12 rounded-2xl"><AvatarFallback className="bg-[#e7efeb] font-bold text-[#4f7463]">{selectedPatient.initials}</AvatarFallback></Avatar><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[23px] tracking-[-0.03em] text-[#132238]">{selectedPatient.name}</h2><StatusBadge status={selectedPatient.status} /></div><p className="mt-1 text-xs text-slate-400">{selectedPatient.id} · {selectedPatient.age} years · {selectedPatient.wound}</p></div></div><Button onClick={() => setAssessmentOpen(true)} className="h-9 rounded-lg bg-[#edf3ef] px-3 text-xs font-bold text-[#4f7463] hover:bg-[#dfeae3]"><FilePlus2 className="mr-2 h-3.5 w-3.5" /> Add follow-up</Button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="detail-stat"><span>Current stage</span><strong>{selectedPatient.stage}</strong></div><div className="detail-stat"><span>Last measurement</span><strong>2.4 × 1.8 cm</strong></div><div className="detail-stat"><span>Next review</span><strong className="text-[#b85b45]">Tomorrow</strong></div></div><div className="mt-6 border-t border-slate-100 pt-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Wound timeline</p><p className="mt-1 text-sm text-slate-500">Latest recorded changes</p></div><Button variant="ghost" className="h-8 rounded-lg px-2 text-xs text-slate-500"><Filter className="mr-1.5 h-3.5 w-3.5" /> 90 days</Button></div><div className="timeline"><div className="timeline-row"><div className="timeline-date">Sep 17<span>Today</span></div><div className="timeline-marker timeline-marker-alert" /><div><p className="text-sm font-semibold text-[#25354a]">Review requested</p><p className="mt-1 text-xs leading-5 text-slate-400">Area changed from 3.8 cm² to 4.3 cm². Compare image and confirm care plan.</p></div></div><div className="timeline-row"><div className="timeline-date">Sep 10<span>7 days ago</span></div><div className="timeline-marker" /><div><p className="text-sm font-semibold text-[#25354a]">Follow-up assessment</p><p className="mt-1 text-xs leading-5 text-slate-400">No fever reported. Wound edges intact. Dressing plan continued.</p></div></div><div className="timeline-row"><div className="timeline-date">Aug 29<span>19 days ago</span></div><div className="timeline-marker" /><div><p className="text-sm font-semibold text-[#25354a]">Initial assessment</p><p className="mt-1 text-xs leading-5 text-slate-400">Image and baseline measurements recorded by care team.</p></div></div></div></div></section><section className="panel-card flex flex-col justify-between bg-[#132238] px-5 py-5 text-white sm:px-6"><div><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a7b7c9]">{t("selectedPatient")}</p><UserRound className="h-4 w-4 text-[#9aabba]" /></div><h3 className="mt-4 font-display text-3xl tracking-[-0.04em]">{t("keepRecordCurrent")}</h3><p className="mt-3 text-sm leading-6 text-[#b8c4d2]">Add an observation, image, or measurement after each review so the care team sees the full wound story.</p></div><Button onClick={() => setAssessmentOpen(true)} className="mt-7 h-11 justify-between rounded-xl bg-white px-4 text-[#132238] hover:bg-[#f1f4f3]">{t("startAssessment")} <ArrowRight className="h-4 w-4" /></Button></section></div>}

      {assessmentOpen && <div className="fixed inset-0 z-50 flex justify-end bg-[#132238]/30 p-3 backdrop-blur-[2px] sm:p-5"><div className="assessment-drawer flex h-full w-full max-w-[510px] flex-col overflow-hidden rounded-2xl bg-[#fbfcfb] shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4f7463]">{t("newClinicalRecord")}</p><h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[#132238]">{t("newAssessment")}</h2><p className="mt-1 text-sm text-slate-400">{t("recordObservation")}</p></div><button onClick={() => setAssessmentOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close assessment"><X className="h-5 w-5" /></button></div><div className="flex-1 space-y-5 overflow-y-auto px-6 py-6"><div><label className="field-label">Patient</label><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><Avatar className="h-9 w-9 rounded-lg"><AvatarFallback className="bg-[#e7efeb] text-xs font-bold text-[#4f7463]">{selectedPatient?.initials ?? "PT"}</AvatarFallback></Avatar><div><p className="text-sm font-semibold text-[#25354a]">{selectedPatient?.name ?? "Select a patient"}</p><p className="text-xs text-slate-400">{selectedPatient?.wound ?? "Patient record"}</p></div><Check className="ml-auto h-4 w-4 text-[#6d9681]" /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">{t("observedStage")}</label><select className="field-control"><option>Stage 1</option><option>Stage 2</option><option>Stage 3</option><option>Unstageable</option></select></div><div><label className="field-label">{t("reviewDate")}</label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field-control pl-9" type="date" defaultValue="2026-09-24" /></div></div></div><div><label className="field-label">{t("woundImage")}</label><button className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#b8cbbf] bg-[#f5f9f6] px-4 py-7 text-center transition-colors hover:bg-[#edf4ef]"><ImagePlus className="h-6 w-6 text-[#6d9681]" /><span className="mt-2 text-sm font-semibold text-[#4f7463]">{t("addImage")}</span><span className="mt-1 text-xs text-slate-400">JPG or PNG · stored securely with the patient record</span></button></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Length (cm)</label><input className="field-control" placeholder="e.g. 2.4" /></div><div><label className="field-label">Width (cm)</label><input className="field-control" placeholder="e.g. 1.8" /></div></div><div><label className="field-label">{t("clinicalNote")}</label><textarea className="field-control min-h-28 resize-none" placeholder={t("clinicalNotePlaceholder")} /></div><div className="rounded-xl bg-[#fff7e7] p-4 text-xs leading-5 text-[#8a6b29]"><div className="flex gap-2"><Stethoscope className="mt-0.5 h-4 w-4 shrink-0" /><p>{t("clinicalDisclaimer")}</p></div></div></div><div className="border-t border-slate-100 bg-white px-6 py-4"><div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => setAssessmentOpen(false)} className="rounded-lg text-slate-500">{t("cancel")}</Button><Button onClick={() => setSaved(true)} className="rounded-lg bg-[#132238] px-5 text-white hover:bg-[#203552]">{saved ? <><Check className="mr-2 h-4 w-4" /> Saved to demo record</> : <>{t("saveAssessment")} <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></div></div></div></div>}
    </DashboardLayout>
  );
}

export { Menu, Search };
