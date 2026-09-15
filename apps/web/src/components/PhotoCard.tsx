import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { WoundStatusChip } from './StateChip'

/**
 * PhotoCard — wound/photo card per pages-draft shared components:
 * thumbnail, capture date, status chip, capturedBy (name + role).
 * Whole card is a ≥44px touch target (NFR-A11Y-1).
 */
export interface PhotoCardProps {
  thumbnailUrl?: string
  /** ISO date of the latest capture (or the photo's own date). */
  date: string
  status?: 'open' | 'healing' | 'closed' | 'amputated' | 'unverified'
  capturedBy?: string
  title: string
  onClick?: () => void
  className?: string
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function PhotoCard({
  thumbnailUrl,
  date,
  status,
  capturedBy,
  title,
  onClick,
  className,
}: PhotoCardProps) {
  const { lang } = useI18n()
  const inner = (
    <>
      <div
        className={cn(
          'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-canvas text-mid-gray',
        )}
        aria-hidden="true"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M4 17l5-4 4 3 3-2 4 3" />
          </svg>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-body-lg font-medium">{title}</span>
        <span className="text-caption text-mid-gray">{formatDate(date, lang)}</span>
        {capturedBy && (
          <span className="text-caption text-mid-gray">{capturedBy}</span>
        )}
        {status && <WoundStatusChip status={status} />}
      </div>
    </>
  )

  const classes = cn(
    'flex w-full items-center gap-4 rounded-card border border-hairline bg-paper p-5 text-start shadow-card transition-transform active:scale-[0.99]',
    className,
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  ) : (
    <div className={classes}>{inner}</div>
  )
}
