import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { CONSENT_DOC_VERSION, useI18n } from '@/i18n'

/**
 * Page 2 — Consent Gate (NFR-COMP-1, FR-PAT-1). PDPA-grade consent before any
 * photo feature; blocks until accepted; re-shown on consent_version bump.
 */
export function ConsentGatePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const accept = async () => {
    setBusy(true)
    try {
      await api.acceptConsent(CONSENT_DOC_VERSION)
      navigate('/wounds', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-card border border-hairline bg-paper p-6 shadow-card">
        <h1 className="text-heading-sm font-semibold">{t('consent.title')}</h1>
        <p className="mt-1 text-caption text-mid-gray">
          v{CONSENT_DOC_VERSION} · 2026-09-15
        </p>

        <div className="mt-4 space-y-3 text-body leading-relaxed">
          {/* Placeholder body — Scribe's consent document v1.0 lands via W-track (build plan S2). */}
          <p className="rounded-[10px] bg-canvas p-4 text-mid-gray">
            [เอกสารคำยินยอม v{CONSENT_DOC_VERSION} — ข้อมูลที่เก็บ / ใครเห็นภาพ / วิธียกเลิกความยินยอม]
          </p>
        </div>

        {accepted === false && (
          <p role="alert" className="mt-4 text-body text-ember-ink">
            [Declined state — withdrawal/re-consent info, plain and unafraid]
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="flex-1 rounded-pill bg-primary px-4 py-2 text-body font-medium text-white disabled:opacity-60"
          >
            {t('consent.accept')}
          </button>
          <button
            type="button"
            onClick={() => setAccepted(false)}
            className="flex-1 rounded-pill bg-canvas px-4 py-2 text-body font-medium"
          >
            {t('consent.decline')}
          </button>
        </div>
      </div>
    </div>
  )
}
