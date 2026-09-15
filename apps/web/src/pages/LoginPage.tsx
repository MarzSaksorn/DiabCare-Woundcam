import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { LangToggle } from '@/components/LangToggle'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/i18n'

/**
 * Page 1 — Login (FR-AUTH-1/2/3). Role comes from the JWT scope server-side;
 * no role picker exposed (pages-draft). Failure copy is non-blaming (tone rule 2).
 */
export function LoginPage() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(false)
    try {
      const session = await api.login(identifier, password)
      showToast('success', t('app.name'))
      navigate(session.role === 'clinician' ? '/clinician' : '/wounds', { replace: true })
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="absolute end-4 top-4">
        <LangToggle />
      </div>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-card border border-hairline bg-paper p-6 shadow-card"
      >
        <h1 className="text-heading font-semibold">{t('login.title')}</h1>
        <p className="mt-1 text-body text-mid-gray">{t('app.tagline')}</p>

        <label className="mt-6 block text-caption font-medium text-mid-gray" htmlFor="identifier">
          {t('login.identifier')}
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-1 w-full rounded-pill bg-canvas px-4 focus:outline-none focus:ring-1 focus:ring-hairline"
        />

        <label className="mt-4 block text-caption font-medium text-mid-gray" htmlFor="password">
          {t('login.password')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-pill bg-canvas px-4 focus:outline-none focus:ring-1 focus:ring-hairline"
        />

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 text-body text-ember">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3.5v5.5M8 12.4v.2" />
            </svg>
            {t('login.error')}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-pill bg-ink px-4 py-2 text-body font-medium text-[#fafafa] disabled:opacity-60"
        >
          {t('login.submit')}
        </button>
      </form>
    </div>
  )
}
