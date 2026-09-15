import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * BottomNav — 5 fixed tabs, mobile-first, ≥44px targets (NFR-A11Y-1).
 * Active state = icon weight/fill change + label emphasis; color is never
 * the sole cue (WCAG 1.4.1). Hidden on immersive screens by Layout.
 */

function TabIcon({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.15 : 0}
      stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const TABS = [
  {
    to: '/clinician',
    labelKey: 'nav.dashboard',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
      </TabIcon>
    ),
  },
  {
    to: '/patients',
    labelKey: 'nav.patients',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5c1.8 1 3 2.9 3 5.5" />
      </TabIcon>
    ),
  },
  {
    to: '/wounds/select',
    labelKey: 'nav.camera',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
        <circle cx="12" cy="13" r="3.5" />
      </TabIcon>
    ),
  },
  {
    to: '/reports',
    labelKey: 'nav.reports',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
        <path d="M14 3.5v4h4M9 12h6M9 16h6" />
      </TabIcon>
    ),
  },
  {
    to: '/settings',
    labelKey: 'nav.profile',
    icon: (active: boolean) => (
      <TabIcon active={active}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" />
      </TabIcon>
    ),
  },
]

export function BottomNav() {
  const { t } = useI18n()
  return (
    <nav
      aria-label={t('nav.bottom')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[4.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-caption',
                isActive ? 'font-semibold text-primary-deep' : 'font-normal text-mid-gray',
              )
            }
          >
            {({ isActive }) => (
              <>
                {tab.icon(isActive)}
                {/* aria-current from NavLink marks active for AT; visual emphasis is weight, not color alone */}
                <span aria-current={isActive ? 'page' : undefined}>{t(tab.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
