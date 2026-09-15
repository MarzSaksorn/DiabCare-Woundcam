import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { api } from '@/api/client'
import { useI18n } from '@/i18n'
import { LangToggle } from './LangToggle'

/**
 * Shared page chrome: header with app name, language toggle, settings + logout.
 * Settings is reachable from every page header (pages-draft nav map).
 */
export function Layout({
  title,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title?: string
  children: ReactNode
  maxWidth?: string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await api.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-body-lg font-semibold">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="9" strokeDasharray="4 2.4" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            {t('app.name')}
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link
              to="/settings"
              className="flex min-h-11 items-center rounded-pill px-3 text-caption font-medium text-mid-gray hover:text-ink"
            >
              {t('nav.settings')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 items-center rounded-pill bg-canvas px-3 text-caption font-medium hover:bg-surface-alt"
            >
              {t('settings.logout')}
            </button>
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full ${maxWidth} px-4 py-6`}>
        {title && <h1 className="mb-4 text-heading-sm font-semibold">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
