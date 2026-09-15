import { useState } from 'react'
import { useNavigate, useParams, useLocation as useRouteLocation } from 'react-router-dom'
import { api } from '@/api/client'
import { Layout } from '@/components/Layout'
import { StateChip } from '@/components/StateChip'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'

/**
 * Page 8 — Review (FR-REV-1/2/3, FR-UPL-1/2). State chips, not quizzes.
 * Retake/Accept pinned ≥44px; nothing persists until Accept; upload runs
 * the two-phase ticket → PUT → complete flow; errors reassure first.
 */
export function ReviewPage() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { woundId } = useParams<{ woundId: string }>()
  const routeLocation = useRouteLocation()
  const unverified = (routeLocation.state as { unverified?: boolean } | null)?.unverified ?? false

  const [phase, setPhase] = useState<'reviewing' | 'uploading' | 'error' | 'accepted'>('reviewing')

  const accept = async () => {
    setPhase('uploading')
    try {
      // Two-phase: ticket → binary PUT (mocked until B6 lands) → complete.
      await api.createUploadTicket(woundId ?? 'new')
      await api.completeUpload('mock-photo-id')
      setPhase('accepted')
      showToast('success', t('review.accepted'))
      navigate('/wounds', { replace: true })
    } catch {
      setPhase('error')
      showToast('error', t('review.uploadError'))
    }
  }

  const chips = [
    { icon: 'ok' as const, label: t('state.focus') },
    { icon: 'ok' as const, label: t('state.rulerVisible') },
    { icon: 'ok' as const, label: t('state.exposureOk') },
  ]

  return (
    <Layout title={t('review.title')}>
      <div className="overflow-hidden rounded-card border border-hairline bg-primary shadow-card">
        <div className="flex aspect-[3/4] items-center justify-center bg-primary text-mid-gray">
          {/* Captured frame renders here; mock placeholder until B6 camera pipeline. */}
          <span className="text-body">{t('review.title')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <StateChip key={chip.label} icon={chip.icon} tone="pass" label={chip.label} />
        ))}
        {unverified && <StateChip icon="unverified" tone="fail" label={t('state.unverified')} />}
      </div>

      {/* FR-REV-3 teaching chip placeholder — heuristic comparison lands with capture pipeline */}
      <p className="mt-3 text-caption text-mid-gray">[Aligned with last photo ✓]</p>

      {phase === 'error' && (
        <p role="alert" className="mt-4 text-body text-ember-ink">
          {t('review.uploadError')}
        </p>
      )}
      {phase === 'uploading' && <p className="mt-4 text-body text-mid-gray">{t('review.uploading')}</p>}

      <div className="sticky bottom-4 mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={phase === 'uploading'}
          className="min-h-11 flex-1 rounded-pill bg-canvas px-4 py-2 text-body font-medium disabled:opacity-60"
        >
          {t('review.retake')}
        </button>
        <button
          type="button"
          onClick={accept}
          disabled={phase === 'uploading' || phase === 'accepted'}
          className="min-h-11 flex-1 rounded-pill bg-primary px-4 py-2 text-body font-medium text-white disabled:opacity-60"
        >
          {t('review.accept')}
        </button>
      </div>
    </Layout>
  )
}
