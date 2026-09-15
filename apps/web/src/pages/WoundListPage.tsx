import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { Wound } from '@/api/types'
import { Layout } from '@/components/Layout'
import { PhotoCard } from '@/components/PhotoCard'
import { useI18n } from '@/i18n'

/**
 * Page 9 — Wound List, patient home (FR-LST-1/3). Reverse-chronological
 * cards; no-wounds state routes to Wound Select; capture buttons per wound.
 */
export function WoundListPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [wounds, setWounds] = useState<Wound[] | null>(null)

  useEffect(() => {
    api.listWounds('01J8ZK3M9P2Q4R5S6T7U8V9W0X').then(setWounds)
  }, [])

  return (
    <Layout title={t('wounds.title')}>
      {wounds === null && <p className="text-mid-gray">{t('common.loading')}</p>}

      {wounds?.length === 0 && (
        <button
          type="button"
          onClick={() => navigate('/wounds/select')}
          className="w-full rounded-card border border-dashed border-hairline bg-paper p-8 text-center text-body text-mid-gray shadow-card"
        >
          {t('wounds.empty')}
        </button>
      )}

      <div className="space-y-3">
        {wounds?.map((w) => (
          <PhotoCard
            key={w.id}
            title={w.location.replace('_', ' ')}
            date={w.firstPhotoAt ?? w.createdAt}
            status={w.status}
            onClick={() => navigate(`/wounds/${w.id}`)}
          />
        ))}
      </div>

      {wounds && wounds.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/wounds/select')}
          className="mt-4 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa]"
        >
          + {t('wounds.addNew')}
        </button>
      )}
      <span className="sr-only">{lang}</span>
    </Layout>
  )
}
