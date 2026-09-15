import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './en'
import { th } from './th'

export type Lang = 'th' | 'en'

export const CONSENT_DOC_VERSION = '1.0'

const dictionaries: Record<Lang, Record<string, string>> = { th, en }

const LANG_KEY = 'woundcam.lang'

function initialLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY)
  return stored === 'en' || stored === 'th' ? stored : 'th' // Thai-first (PRD G4)
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translate a key; falls back to the key itself when missing. */
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(LANG_KEY, next)
    document.documentElement.lang = next
  }, [])

  const t = useCallback(
    (key: string) => dictionaries[lang][key] ?? dictionaries.th[key] ?? key,
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
