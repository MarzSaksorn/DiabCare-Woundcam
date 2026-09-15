import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { Patient } from '@/api/types'
import { Layout } from '@/components/Layout'
import { useI18n } from '@/i18n'

/**
 * /patients — patient list view, same mock data + consent chips as the
 * dashboard rows; the bottom-nav Patients tab lands here.
 */
export function PatientsPage() {
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

  return (
    <Layout title={t('nav.patients')}>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('clinician.search')}
        className="w-full rounded-pill bg-paper px-4 ring-1 ring-hairline focus:outline-none focus:ring-1 focus:ring-hairline"
      />

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
