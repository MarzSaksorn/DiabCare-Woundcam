import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { Photo } from '@/api/types'
import { Layout } from '@/components/Layout'
import { PhotoCard } from '@/components/PhotoCard'
import { useI18n } from '@/i18n'

/**
 * Page 10 — Wound Detail / Compare (FR-LST-2, FR-WND-1/3, FR-CAP-7).
 * Side-by-side latest vs previous accepted photo, chronological timeline,
 * pending-confirmation banner, unverified flags surfaced.
 */
export function WoundDetailPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { woundId } = useParams<{ woundId: string }>()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [compare, setCompare] = useState(true)

  useEffect(() => {
    if (!woundId) return
    api.listPhotos(woundId).then(setPhotos)
  }, [woundId])

  const [latest, previous] = photos

  return (
    <Layout title={t('wounds.detail')}>
      <div className="flex items-center justify-between">
        <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
          {t('wounds.compare')}
        </h2>
        <button
          type="button"
          aria-pressed={compare}
          onClick={() => setCompare((c) => !c)}
          className="min-h-11 rounded-pill bg-canvas px-3 text-caption font-medium"
        >
          {compare ? '1 × 1' : '2 × 1'}
        </button>
      </div>

      {latest && !latest.thumbnailUrl && (
        <p className="mt-3 rounded-[10px] bg-canvas p-3 text-caption text-mid-gray">
          [Photos render from presigned R2 URLs — FR-UPL-3; mock pipeline pending]
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {latest && <PhotoCard title={t('wounds.detail')} date={latest.capturedAt} status={latest.unverified ? 'unverified' : undefined} />}
        {compare && previous && (
          <PhotoCard title={t('wounds.compare')} date={previous.capturedAt} status={previous.unverified ? 'unverified' : undefined} />
        )}
        {!previous && (
          <p className="rounded-card border border-dashed border-hairline bg-paper p-6 text-center text-caption text-mid-gray">
            [single-photo state — latest only + hint chip]
          </p>
        )}
      </div>

      <h2 className="mt-6 text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
        {t('nav.wounds')}
      </h2>
      <div className="mt-3 space-y-3">
        {photos.map((p) => (
          <PhotoCard
            key={p.id}
            title={p.id.slice(-6)}
            date={p.capturedAt}
            status={p.unverified ? 'unverified' : undefined}
            onClick={() => navigate(`/wounds/${woundId}`)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate(`/wounds/${woundId ?? 'new'}/capture`)}
        className="mt-4 w-full rounded-pill bg-primary px-4 py-2 text-body font-medium text-white"
      >
        {t('wounds.capture')}
      </button>
    </Layout>
  )
}
