import type { WoundStatus } from '@/api/types'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * StateChip — status = icon + short text, never color alone (NFR-A11Y-2,
 * WCAG 1.4.1). Chip geometry per reference spec: 12px radius, 2px 8px pad.
 * Small-text tones use the AA-darkened -ink variants on white.
 */
export type ChipTone = 'neutral' | 'pass' | 'fail' | 'destructive'

const ICONS: Record<string, string> = {
  open: 'M8 4v8',
  healing: 'M4 8h8M8 4v8',
  closed: 'M4 8l3 3 5-6',
  amputated: 'M4 4l8 8M12 4l-8 8',
  unverified: 'M8 4v5M8 11.5v.5',
  ok: 'M4 8l3 3 5-6',
  fail: 'M4 4l8 8M12 4l-8 8',
}

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: 'bg-surface-alt text-ink',
  pass: 'bg-paper text-success-ink ring-1 ring-success/40',
  fail: 'bg-paper text-ink ring-1 ring-hairline',
  // Coral is the alert voice; -ink keeps small text at AA contrast
  destructive: 'bg-paper text-ember-ink ring-1 ring-ember/40',
}

export interface StateChipProps {
  /** Icon key maps to a status concept; label comes from i18n by caller. */
  icon?: keyof typeof ICONS
  tone?: ChipTone
  label: string
  className?: string
}

export function stateToneFor(status: WoundStatus | 'unverified'): ChipTone {
  switch (status) {
    case 'healing':
    case 'closed':
      return 'pass'
    case 'unverified':
      return 'fail'
    case 'amputated':
      return 'destructive'
    default:
      return 'neutral'
  }
}

export function StateChip({ icon, tone = 'neutral', label, className }: StateChipProps) {
  const d = icon ? ICONS[icon] : undefined
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[12px] px-2 py-0.5 text-caption font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {d && (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={d} />
        </svg>
      )}
      <span>{label}</span>
    </span>
  )
}

/** Convenience: wound-status chip with i18n label baked in. */
export function WoundStatusChip({ status }: { status: WoundStatus | 'unverified' }) {
  const { t } = useI18n()
  return (
    <StateChip
      icon={status}
      tone={stateToneFor(status)}
      label={t(`state.${status}`)}
    />
  )
}
