import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Layout } from '@/components/Layout'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'

/**
 * Page 4 — Add Patient (FR-PAT-1/2/3). Fields exactly per FR-PAT-1;
 * per-field inline validation; success → Patient Profile. Consent starts
 * on the patient's device via the Consent Gate.
 */
export function AddPatientPage() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [mrn, setMrn] = useState('')
  const [fullName, setFullName] = useState('')
  const [dmType, setDmType] = useState<'type1' | 'type2' | 'gdm'>('type2')
  const [hba1c, setHba1c] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!mrn.trim()) next.mrn = t('common.error')
    if (!fullName.trim()) next.fullName = t('common.error')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    try {
      await api.createPatient({ mrn, fullName, dmType, hba1c: hba1c ? Number(hba1c) : undefined })
      showToast('success', t('clinician.addPatient'))
      navigate('/clinician')
    } catch {
      showToast('error', t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-pill bg-canvas px-4 focus:outline-none focus:ring-1 focus:ring-hairline'

  return (
    <Layout title={t('clinician.addPatient')}>
      <form onSubmit={submit} className="rounded-card border border-hairline bg-paper p-6 shadow-card">
        <label className="block text-caption font-medium text-mid-gray" htmlFor="mrn">
          MRN
        </label>
        <input id="mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} className={fieldClass} />
        {errors.mrn && <p className="text-caption text-ember">{errors.mrn}</p>}

        <label className="mt-4 block text-caption font-medium text-mid-gray" htmlFor="fullName">
          ชื่อ-นามสกุล / Full name
        </label>
        <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
        {errors.fullName && <p className="text-caption text-ember">{errors.fullName}</p>}

        <fieldset className="mt-4">
          <legend className="text-caption font-medium text-mid-gray">dm_type</legend>
          <div className="mt-1 flex gap-2">
            {(['type1', 'type2', 'gdm'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={dmType === v}
                onClick={() => setDmType(v)}
                className={`min-h-11 flex-1 rounded-pill px-3 text-body font-medium ${
                  dmType === v ? 'bg-ink text-[#fafafa]' : 'bg-canvas text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-caption font-medium text-mid-gray" htmlFor="hba1c">
          HbA1c (%)
        </label>
        <input
          id="hba1c"
          inputMode="decimal"
          value={hba1c}
          onChange={(e) => setHba1c(e.target.value)}
          className={fieldClass}
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa] disabled:opacity-60"
        >
          {t('clinician.addPatient')}
        </button>
      </form>
    </Layout>
  )
}
