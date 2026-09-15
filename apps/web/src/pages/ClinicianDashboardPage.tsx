import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { Patient } from '@/api/types'
import { Layout } from '@/components/Layout'
import { useI18n } from '@/i18n'

/**
 * Page 3 — Clinician Dashboard (FR-PAT-2, FR-LST-3). Search by name/MRN,
 * totals row, patient rows, prominent Add Patient.
 */
export function ClinicianDashboardPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[] | null>(null)

  useEffect(() => {
    let cancelled = false
    api.listPatients(search).then((rows) => {
      if (!cancelled) setPatients(rows)
    })
    return () => {
      cancelled = true
    }
  }, [search])

  const totals = useMemo(
    () => ({ patients: patients?.length ?? 0, wounds: 0 }),
    [patients],
  )

  return (
    <Layout title={t('clinician.title')}>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('clinician.search')}
        className="w-full rounded-pill bg-paper px-4 ring-1 ring-hairline focus:outline-none focus:ring-1 focus:ring-hairline"
      />

      <div className="mt-4 flex gap-6 text-caption text-mid-gray">
        <span>
          {t('clinician.title')}: <strong className="text-ink">{totals.patients}</strong>
        </span>
        <span>
          {t('nav.wounds')}: <strong className="text-ink">{totals.wounds}</strong>
        </span>
      </div>

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
