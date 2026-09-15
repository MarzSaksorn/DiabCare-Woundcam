import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, fetchLiveOverview } from '@/api/client'
import type { LiveOverviewStats, Patient, PatientOverviewStats } from '@/api/types'
import { Layout } from '@/components/Layout'
import { ErrorState } from '@/components/ErrorState'
import { DonutChart, DonutLegend } from '@/components/charts/DonutChart'
import { LineAreaChart } from '@/components/charts/LineAreaChart'
import { useI18n } from '@/i18n'

/**
 * Page 3 — Clinician Dashboard (FR-PAT-2, FR-LST-3).
 * Structured, uniform layout — no bento:
 *   slim classification strip → 5 equal KPI cards (1/3/5 cols) →
 *   two full-width breakdown panels (severity, diabetes type) →
 *   search + patient list.
 * Same 16px gap rhythm everywhere; every card aligns to one grid.
 */

const GAP = 'gap-4'

/** Provenance pill — text carries the meaning, the dot is decorative (WCAG 1.4.1). */
function SourceChip({ mode, liveLabel, sampleLabel }: {
  mode: 'live' | 'sample'
  liveLabel: string
  sampleLabel: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[12px] px-2 py-0.5 text-caption font-medium ring-1 ${
        mode === 'live'
          ? 'bg-surface-alt text-primary-deep ring-primary/30'
          : 'bg-canvas text-mid-gray ring-hairline'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-2.5 w-2.5"
        fill={mode === 'live' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        {mode === 'live' ? <circle cx="8" cy="8" r="4" stroke="none" /> : <path d="M8 2v12M2 8h12" strokeLinecap="round" />}
      </svg>
      {mode === 'live' ? liveLabel : sampleLabel}
    </span>
  )
}

function KpiCard({ label, value, alertIcon, chip }: {
  label: string
  value: string
  alertIcon?: boolean
  chip?: React.ReactNode
}) {
  return (
    <div className={`flex flex-col rounded-card border border-hairline bg-paper p-5 shadow-card`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">{label}</p>
        {chip}
      </div>
      <p className="mt-2 flex items-center gap-2 text-heading-sm font-semibold tracking-[-0.6px]">
        {alertIcon && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4 text-ember"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M8 3.5v5.5M8 12.4v.2" />
          </svg>
        )}
        {value}
      </p>
    </div>
  )
}

/** Horizontal stacked severity bar — segments sized by share; legend carries text. */
function SeverityStackedBar({ severity, ariaLabel }: {
  severity: PatientOverviewStats['severityBreakdown']
  ariaLabel: string
}) {
  const total = severity.critical + severity.high + severity.normal
  const segments = [
    { count: severity.critical, color: 'var(--color-ember)', labelKey: 'state.critical' },
    { count: severity.high, color: 'var(--color-primary)', labelKey: 'state.high' },
    { count: severity.normal, color: 'var(--color-success)', labelKey: 'state.normal' },
  ]
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex h-3 w-full overflow-hidden rounded-full"
    >
      {segments.map((seg) => (
        <span
          key={seg.labelKey}
          style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
        />
      ))}
    </div>
  )
}

export function ClinicianDashboardPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[] | null>(null)
  const [patientsError, setPatientsError] = useState(false)
  const [stats, setStats] = useState<PatientOverviewStats | null>(null)
  const [live, setLive] = useState<LiveOverviewStats | null>(null)

  const loadPatients = useCallback((q: string) => {
    setPatientsError(false)
    api.listPatients(q)
      .then((rows) => setPatients(rows))
      .catch(() => setPatientsError(true))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLiveOverview().then((s) => {
      if (!cancelled) setLive(s) // null on any failure → all-mock fallback
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    loadPatients(search)
  }, [loadPatients, search])

  useEffect(() => {
    let cancelled = false
    api.getPatientOverviewStats().then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const fmt = useMemo(
    () => new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-GB'),
    [lang],
  )

  const severity = stats?.severityBreakdown
  const severityTotal = severity ? severity.critical + severity.high + severity.normal : 0
  const dm = stats?.dmBreakdown
  const dmSlices = live
    ? [
        { label: t('stats.type1'), value: live.patients.type1, color: '#35bdfb' },
        { label: t('stats.type2'), value: live.patients.type2, color: '#1568e8' },
        { label: t('stats.gdm'), value: live.patients.gdm, color: '#0a4fbe' },
      ]
    : dm
      ? [
          { label: t('stats.type1'), value: dm.type1, color: '#35bdfb' },
          { label: t('stats.type2'), value: dm.type2, color: '#1568e8' },
          { label: t('stats.gdmUnknown'), value: dm.gdmUnknown, color: '#0a4fbe' },
        ]
      : []
  const dmTotal = live ? live.patients.total : dm ? dm.type1 + dm.type2 + dm.gdmUnknown : 0
  const avgHba1c = live ? live.hba1c.avgOverall : stats?.avgHba1c
  const patientMode = live ? 'live' : 'sample'
  const severitySlices = severity
    ? [
        { label: t('state.critical'), value: severity.critical, color: '#e84d67' },
        { label: t('state.high'), value: severity.high, color: '#1568e8' },
        { label: t('state.normal'), value: severity.normal, color: '#16b67a' },
      ]
    : []

  return (
    <Layout title={t('clinician.title')}>
      <div className={`flex flex-col ${GAP}`}>
        {/* Slim classification strip under the header */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-pill border border-hairline bg-paper px-4 py-1.5 shadow-card">
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-ink">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-primary-deep"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <rect x="3" y="7" width="10" height="6" rx="1.5" />
              <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
            </svg>
            {t('stats.confidential')}
          </span>
          <span className="text-caption text-mid-gray">{t('stats.sampleDataset')}</span>
        </div>

        {/* TOP ROW — five equal KPI cards: 1 col phone, 3+2 tablet, 5 across desktop */}
        <div className={`grid grid-cols-1 ${GAP} sm:grid-cols-3 lg:grid-cols-5`}>
          <KpiCard
            label={t('stats.totalPatients')}
            value={fmt.format(live ? live.patients.total : (stats?.totalPatients ?? 0))}
            chip={stats ? <SourceChip mode={patientMode} liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} /> : undefined}
          />
          <KpiCard
            label={t('stats.totalWounds')}
            value={stats ? fmt.format(stats.totalWounds) : '…'}
            chip={stats ? <SourceChip mode="sample" liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} /> : undefined}
          />
          <KpiCard
            label={t('stats.redAlerts')}
            value={stats ? fmt.format(stats.redAlerts) : '…'}
            alertIcon
            chip={stats ? <SourceChip mode="sample" liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} /> : undefined}
          />
          <KpiCard
            label={t('stats.activeReports')}
            value={stats ? fmt.format(stats.activeReports) : '…'}
            chip={stats ? <SourceChip mode="sample" liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} /> : undefined}
          />
          <KpiCard
            label={t('stats.patientsMatched')}
            value={fmt.format(patients?.length ?? 0)}
          />
        </div>

        {/* Charts row 1 — severity stacked bar + diabetes-type donut */}
        <div className={`grid grid-cols-1 ${GAP} lg:grid-cols-2`}>
          <section
            aria-label={t('stats.severity')}
            className="flex flex-col rounded-card border border-hairline bg-paper p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
                {t('stats.severity')}
              </h2>
              <SourceChip mode="sample" liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} />
            </div>
            {severity ? (
              <div className="mt-4 flex flex-1 flex-col justify-center gap-4">
                <SeverityStackedBar
                  severity={severity}
                  ariaLabel={t('charts.aria.severity')}
                />
                <DonutLegend slices={severitySlices} total={severityTotal} fmt={fmt} />
              </div>
            ) : (
              <p className="mt-4 text-body text-mid-gray">{t('common.loading')}</p>
            )}
          </section>

          <section
            aria-label={t('stats.dmBreakdown')}
            className="flex flex-col rounded-card border border-hairline bg-paper p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
                {t('stats.dmBreakdown')}
              </h2>
              <SourceChip mode={patientMode} liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} />
            </div>
            {dm || live ? (
              <div className="mt-4 flex flex-1 flex-col justify-center gap-4">
                <div className="flex items-center justify-center gap-6">
                  <DonutChart
                    slices={dmSlices}
                    centerValue={fmt.format(dmTotal)}
                    centerLabel={t('stats.totalPatients')}
                    ariaLabel={t('charts.aria.dm')}
                    size={150}
                  />
                  <DonutLegend slices={dmSlices} total={dmTotal} fmt={fmt} />
                </div>
                <div className="flex items-center justify-between border-t border-hairline pt-3">
                  <span className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
                    {t('stats.avgHba1c')}
                  </span>
                  <span className="text-body-lg font-semibold">
                    {avgHba1c != null ? `${avgHba1c.toFixed(1)}%` : '…'}
                  </span>
                </div>
                {live && live.hba1c.trend.length > 1 && (
                  <div>
                    <p className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
                      {t('stats.hba1cTrend')}
                    </p>
                    <LineAreaChart
                      points={live.hba1c.trend.map((x) => ({ label: x.period, count: x.avg }))}
                      ariaLabel={t('stats.hba1cTrend')}
                      gradientId="hba1c-trend-fill"
                      colorVar="--color-primary-deep"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-body text-mid-gray">{t('common.loading')}</p>
            )}
          </section>
        </div>

        {/* Charts row 2 — capture trend, full width */}
        <section
          aria-label={t('charts.aria.trend')}
          className="rounded-card border border-hairline bg-paper p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
              {t('charts.periodAxis')}
            </h2>
            <SourceChip mode="sample" liveLabel={t('stats.liveDatabase')} sampleLabel={t('stats.sampleDataset')} />
          </div>
          {stats ? (
            <div className="mt-3">
              <LineAreaChart
                points={stats.captureTrend}
                ariaLabel={t('charts.aria.trend')}
                gradientId="trend-fill"
              />
            </div>
          ) : (
            <p className="mt-4 text-body text-mid-gray">{t('common.loading')}</p>
          )}
        </section>

        {/* Search + patient list */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('clinician.search')}
          className="w-full rounded-pill bg-paper px-4 ring-1 ring-hairline focus:outline-none focus:ring-1 focus:ring-hairline"
        />

        <button
          type="button"
          onClick={() => navigate('/clinician/patients/new')}
          className="w-full rounded-pill bg-primary px-4 py-2 text-body font-medium text-white"
        >
          + {t('clinician.addPatient')}
        </button>

        <div className={`flex flex-col ${GAP}`}>
          {patientsError ? (
            <ErrorState onRetry={() => loadPatients(search)} />
          ) : (
            <>
              {patients === null && <p className="text-mid-gray">{t('common.loading')}</p>}
              {patients?.length === 0 && (
                <p className="rounded-card border border-hairline bg-paper p-6 text-center text-mid-gray">
                  {t('clinician.empty')}
                </p>
              )}
            </>
          )}
          {patients?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/clinician/patients/${p.id}`)}
              className="flex w-full items-center justify-between rounded-card border border-hairline bg-paper p-5 text-start shadow-card"
            >
              <span className="flex flex-col">
                <span className="text-body-lg font-medium">{p.fullName}</span>
                <span className="text-caption text-mid-gray">{p.mrn}</span>
              </span>
              <span className="text-caption text-mid-gray">
                {p.consent ? '✓' : '—'} {t('settings.consentStatus')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
