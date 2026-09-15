import { useI18n } from '@/i18n'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * LangToggle — TH/EN switch, persists per device, TH default (FR-PLT-1).
 * Two equal options; the active one is ink-filled (bible's filled/ghost pair).
 */
const OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'EN' },
]

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn('inline-flex rounded-pill bg-canvas p-1', className)}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLang(opt.value)}
            className={cn(
              'min-h-11 rounded-pill px-3 text-caption font-medium transition-colors',
              active ? 'bg-ink text-[#fafafa]' : 'text-mid-gray',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
