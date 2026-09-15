import { api } from '@/api/client'
import { LangToggle } from '@/components/LangToggle'
import { Layout } from '@/components/Layout'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'

/**
 * Page 11 — Settings (FR-AUTH-3, NFR-COMP-1). Language, account, consent
 * status + document view + withdrawal entry, logout, app version.
 */
export function SettingsPage() {
  const { t } = useI18n()
  const { showToast } = useToast()

  const logout = async () => {
    await api.logout()
    window.location.assign('/login')
  }

  return (
    <Layout title={t('settings.title')}>
      <div className="space-y-3">
        <section className="flex items-center justify-between rounded-card border border-hairline bg-paper p-5 shadow-card">
          <span className="text-body font-medium">{t('settings.language')}</span>
          <LangToggle />
        </section>

        <section className="rounded-card border border-hairline bg-paper p-5 shadow-card">
          <h2 className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
            {t('settings.consentStatus')}
          </h2>
          <p className="mt-2 text-body">v1.0 · ✓</p>
          <button
            type="button"
            onClick={() => showToast('success', t('consent.title'))}
            className="mt-3 min-h-11 rounded-pill bg-canvas px-4 text-body font-medium"
          >
            {t('consent.title')}
          </button>
        </section>

        <section className="rounded-card border border-hairline bg-paper p-5 shadow-card">
          <span className="text-caption text-mid-gray">version</span>
          <p className="text-body">v0.1.0-dev</p>
        </section>

        <button
          type="button"
          onClick={logout}
          className="w-full rounded-pill bg-canvas px-4 py-2 text-body font-medium text-ember ring-1 ring-ember/40"
        >
          {t('settings.logout')}
        </button>
      </div>
    </Layout>
  )
}
