import { useI18n } from '@/i18n'

/**
 * ErrorState — the shared list/page failure state from the pages-draft
 * state matrix: icon + text + retry, never a color-only cue. Reuses the
 * existing i18n keys so no resource changes are needed.
 */
export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-paper p-6 text-center shadow-card"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-8 w-8 text-ember"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.4v.2" />
      </svg>
      <p className="text-body text-mid-gray">{message ?? t('common.error')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-pill bg-primary px-4 text-body font-medium text-white"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}
