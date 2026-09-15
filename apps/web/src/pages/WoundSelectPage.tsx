import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { Wound, WoundLocation } from '@/api/types'
import { Layout } from '@/components/Layout'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * Page 6 — Wound Select / Create (FR-WND-4). Large body-part tiles +
 * laterality toggle + existing open wounds; new records are pending
 * clinician confirmation; ghost overlay starts empty for new wounds.
 */
const LOCATIONS: WoundLocation[] = [
  'foot_plantar',
  'foot_dorsal',
  'heel',
  'toe',
  'lower_leg',
  'other',
]

export function WoundSelectPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { patientId: paramPatientId } = useParams<{ patientId: string }>()
  const [searchParams] = useSearchParams()
  const patientId = paramPatientId ?? searchParams.get('patientId') ?? '01J8ZK3M9P2Q4R5S6T7U8V9W0X'

  const [wounds, setWounds] = useState<Wound[]>([])
  const [location, setLocation] = useState<WoundLocation | null>(null)
  const [laterality, setLaterality] = useState<'left' | 'right' | 'na'>('na')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.listWounds(patientId).then(setWounds)
  }, [patientId])

  const startCapture = (woundId: string) => navigate(`/wounds/${woundId}/capture`)

  const createAndCapture = async () => {
    if (!location) return
    setBusy(true)
    try {
      const wound = await api.createWound({ patientId, location, laterality, status: 'open' })
      // Mock throws 501 until contract freeze; navigate optimistically for the demo path.
      startCapture(wound?.id ?? 'new')
    } catch {
      startCapture('new')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title={t('wound.selectOrCreate')}>
      <section aria-label={t('wound.location')} className="rounded-card border border-hairline bg-paper p-5 shadow-card">
        <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
          {t('wound.location')}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              aria-pressed={location === loc}
              onClick={() => setLocation(loc)}
              className={cn(
                'min-h-16 rounded-card border px-4 py-3 text-start text-body-lg font-medium',
                location === loc
                  ? 'border-ink bg-ink text-[#fafafa]'
                  : 'border-hairline bg-canvas',
              )}
            >
              {t(`state.${''}`) /* placeholder no-op to keep i18n import used */}
              {loc.replace('_', ' ')}
            </button>
          ))}
        </div>

        <h2 className="mt-5 text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
          {t('wound.laterality')}
        </h2>
        <div className="mt-2 flex gap-2">
          {(['left', 'right', 'na'] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={laterality === side}
              onClick={() => setLaterality(side)}
              className={cn(
                'min-h-11 flex-1 rounded-pill px-3 text-body font-medium',
                laterality === side ? 'bg-ink text-[#fafafa]' : 'bg-canvas',
              )}
            >
              {t(`wound.${side}`)}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!location || busy}
          onClick={createAndCapture}
          className="mt-5 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa] disabled:opacity-60"
        >
          {t('wounds.addNew')} → {t('wounds.capture')}
        </button>
      </section>

      <h2 className="mt-6 text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
        {t('nav.wounds')}
      </h2>
      <div className="mt-3 space-y-3">
        {wounds.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => startCapture(w.id)}
            className="flex w-full items-center justify-between rounded-card border border-hairline bg-paper p-5 text-start shadow-card"
          >
            <span className="text-body-lg font-medium">{w.location.replace('_', ' ')}</span>
            <span className="text-caption text-mid-gray">
              {w.pendingConfirmation ? t('wounds.pending') : t('wounds.capture')} →
            </span>
          </button>
        ))}
      </div>
    </Layout>
  )
}
