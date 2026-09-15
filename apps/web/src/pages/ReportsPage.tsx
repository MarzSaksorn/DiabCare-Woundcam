import { Layout } from '@/components/Layout'
import { StateChip } from '@/components/StateChip'
import { useI18n } from '@/i18n'

/**
 * /reports — placeholder index. Full photo-based PDF reports are v0.3
 * (PRD §2 non-goals for v0.1); this exists so the nav tab has a real
 * destination instead of a dead link.
 */
export function ReportsPage() {
  const { t } = useI18n()
  return (
    <Layout title={t('nav.reports')}>
      <div className="rounded-card border border-hairline bg-paper p-8 text-center shadow-card">
        <StateChip icon="unverified" tone="neutral" label="v0.3" className="mb-3" />
        <p className="text-body text-mid-gray">
          {t('reports.placeholder')}
        </p>
      </div>
    </Layout>
  )
}
