import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { Patient, PatientOverviewStats } from '@/api/types'
import { Layout } from '@/components/Layout'
import { useI18n } from '@/i18n'

/**
 * Page 3 — Clinician Dashboard (FR-PAT-2, FR-LST-3). Search by name/MRN,
 * patient-overview stat panel (sample dataset — Srinakarin-shaped
 * aggregates, no PHI), patient rows, prominent Add Patient.
 */

function StatCard({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-hairline bg-paper p-5 shadow-card">
      <p className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">{label}</p>
      {value !== undefined && (
        <p className="mt-1 text-heading-sm font-semibold tracking-[-0.6px]">{value}</p>
      )}
      {children}
    </div>
  )
}

export function ClinicianDashboardPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[] | null>(null)
  const [stats, setStats] = useState<PatientOverviewStats | null>(null)

  useEffect(() => {
    let cancelled = false
    api.listPatients(search).then((rows) => {
      if (!cancelled) setPatients(rows)
    })
    return () => {
      cancelled = true
    }
  }, [search])

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

  return (
    <Layout title={t('clinician.title')}>
      {/* Patient overview — aggregates from the demo sample dataset (no PHI) */}
      <section aria-label={t('stats.sampleDataset')}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-hairline bg-canvas px-2 py-0.5 text-caption font-medium text-mid-gray">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="me-1.5 h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M8 2v12M2 8h12" />
            </svg>
            {t('stats.sampleDataset')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t('stats.totalPatients')}
            value={stats ? fmt.format(stats.totalPatients) : '…'}
          />
          <StatCard
            label={t('stats.totalWounds')}
            value={stats ? fmt.format(stats.totalWounds) : '…'}
          />
          <StatCard label={t('stats.dmBreakdown')}>
            {stats ? (
              <dl className="mt-2 space-y-1.5 text-body">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-mid-gray">{t('stats.type1')}</dt>
                  <dd className="font-semibold">{fmt.format(stats.dmBreakdown.type1)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-mid-gray">{t('stats.type2')}</dt>
                  <dd className="font-semibold">{fmt.format(stats.dmBreakdown.type2)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-mid-gray">{t('stats.gdmUnknown')}</dt>
                  <dd className="font-semibold">{fmt.format(stats.dmBreakdown.gdmUnknown)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-body text-mid-gray">…</p>
            )}
          </StatCard>
          <StatCard
            label={t('stats.avgHba1c')}
            value={stats ? `${stats.avgHba1c.toFixed(1)}%` : '…'}
          />
        </div>
      </section>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('clinician.search')}
        className="mt-6 w-full rounded-pill bg-paper px-4 ring-1 ring-hairline focus:outline-none focus:ring-1 focus:ring-hairline"
      />

      <button
        type="button"
        onClick={() => navigate('/clinician/patients/new')}
        className="mt-4 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa]"
      >
        + {t('clinician.addPatient')}
      </button>

      <div className="mt-4 space-y-3">
        {patients === null && <p className="text-mid-gray">{t('common.loading')}</p>}
        {patients?.length === 0 && (
          <p className="rounded-card border border-hairline bg-paper p-6 text-center text-mid-gray">
            {t('clinician.empty')}
          </p>
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
    </Layout>
  )
}
