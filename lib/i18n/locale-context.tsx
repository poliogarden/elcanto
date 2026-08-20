'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadLocalePreferences, saveInterfaceLocale, saveResultLanguage } from '@/lib/i18n/storage'
import { resolveResultLanguage } from '@/lib/i18n/resolve'
import { translate } from '@/lib/i18n/translate'
import type {
  InterfaceLocale,
  LocalePreferences,
  ResolvedOutputLanguage,
  ResultLanguage,
} from '@/lib/i18n/types'
import {
  DEFAULT_INTERFACE_LOCALE,
  DEFAULT_RESULT_LANGUAGE,
} from '@/lib/i18n/types'

type LocaleContextValue = {
  interfaceLocale: InterfaceLocale
  resultLanguage: ResultLanguage
  resolvedOutputLanguage: ResolvedOutputLanguage
  setInterfaceLocale: (locale: InterfaceLocale) => void
  setResultLanguage: (language: ResultLanguage) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  // SSR and the first client render must match — load saved prefs after mount.
  const [prefs, setPrefs] = useState<LocalePreferences>({
    interfaceLocale: DEFAULT_INTERFACE_LOCALE,
    resultLanguage: DEFAULT_RESULT_LANGUAGE,
  })

  useEffect(() => {
    setPrefs(loadLocalePreferences())
  }, [])

  const resolvedOutputLanguage = useMemo(
    () => resolveResultLanguage(prefs.resultLanguage, prefs.interfaceLocale),
    [prefs.resultLanguage, prefs.interfaceLocale],
  )

  const setInterfaceLocale = useCallback((locale: InterfaceLocale) => {
    saveInterfaceLocale(locale)
    setPrefs((p) => ({ ...p, interfaceLocale: locale }))
  }, [])

  const setResultLanguage = useCallback((language: ResultLanguage) => {
    saveResultLanguage(language)
    setPrefs((p) => ({ ...p, resultLanguage: language }))
  }, [])

  useEffect(() => {
    document.documentElement.lang = prefs.interfaceLocale
  }, [prefs.interfaceLocale])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(prefs.interfaceLocale, key, params),
    [prefs.interfaceLocale],
  )

  const value = useMemo(
    () => ({
      interfaceLocale: prefs.interfaceLocale,
      resultLanguage: prefs.resultLanguage,
      resolvedOutputLanguage,
      setInterfaceLocale,
      setResultLanguage,
      t,
    }),
    [
      prefs.interfaceLocale,
      prefs.resultLanguage,
      resolvedOutputLanguage,
      setInterfaceLocale,
      setResultLanguage,
      t,
    ],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/** Shorthand for components that only need t() */
export function useTranslation() {
  const { t, interfaceLocale, resultLanguage, resolvedOutputLanguage } = useLocale()
  return { t, interfaceLocale, resultLanguage, resolvedOutputLanguage }
}
