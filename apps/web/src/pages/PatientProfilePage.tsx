import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { Patient, Wound } from '@/api/types'
import { Layout } from '@/components/Layout'
import { WoundStatusChip } from '@/components/StateChip'
import { useI18n } from '@/i18n'

/**
 * Page 5 — Patient Profile, clinician view (FR-PAT-1/3, FR-WND-1).
 * Identity header, clinical subset (layout ready for v0.3 patient_clinical),
 * consent status chip, patient's wound list, Add Wound.
 */
export function PatientProfilePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { patientId } = useParams<{ patientId: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [wounds, setWounds] = useState<Wound[]>([])

  useEffect(() => {
    if (!patientId) return
    api.getPatient(patientId).then(setPatient)
    api.listWounds(patientId).then(setWounds)
  }, [patientId])

  return (
    <Layout title={patient?.fullName}>
      {patient && (
        <div className="rounded-card border border-hairline bg-paper p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-caption text-mid-gray">{patient.mrn}</span>
            <span className="flex items-center gap-1.5 text-caption">
              {patient.consent ? '✓' : '✗'} {t('settings.consentStatus')} v{patient.consentVersion ?? '—'}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-body">
            <div>
              <dt className="text-caption text-mid-gray">dm_type</dt>
              <dd>{patient.dmType}</dd>
            </div>
            <div>
              <dt className="text-caption text-mid-gray">HbA1c</dt>
              <dd>{patient.hba1c ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-caption text-mid-gray">dm_onset</dt>
              <dd>{patient.dmOnset ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-caption text-mid-gray">identify_by</dt>
              <dd>{patient.identifyBy}</dd>
            </div>
          </dl>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(`/wounds/select?patientId=${patientId}`)}
        className="mt-4 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa]"
      >
        + {t('wounds.addNew')}
      </button>

      <div className="mt-4 space-y-3">
        {wounds.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => navigate(`/wounds/${w.id}`)}
            className="flex w-full items-center justify-between rounded-card border border-hairline bg-paper p-5 text-start shadow-card"
          >
            <span className="flex flex-col gap-1">
              <span className="text-body-lg font-medium">
                {t(`wound.location`)}: {w.location}
              </span>
              <span className="text-caption text-mid-gray">
                {w.laterality === 'na' ? t('wound.na') : t(`wound.${w.laterality}`)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {w.pendingConfirmation && (
                <span className="text-caption text-mid-gray">{t('wounds.pending')}</span>
              )}
              <WoundStatusChip status={w.status} />
            </span>
          </button>
        ))}
      </div>
    </Layout>
  )
}
