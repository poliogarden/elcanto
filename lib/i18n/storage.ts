import type { LocalePreferences } from '@/lib/i18n/types'
import {
  DEFAULT_INTERFACE_LOCALE,
  DEFAULT_RESULT_LANGUAGE,
} from '@/lib/i18n/types'
import {
  detectBrowserInterfaceLocale,
  parseInterfaceLocale,
  parseResultLanguage,
} from '@/lib/i18n/resolve'

const INTERFACE_KEY = 'elcanto.interfaceLanguage'
const RESULT_KEY = 'elcanto.resultLanguage'

export function loadLocalePreferences(): LocalePreferences {
  if (typeof window === 'undefined') {
    return {
      interfaceLocale: DEFAULT_INTERFACE_LOCALE,
      resultLanguage: DEFAULT_RESULT_LANGUAGE,
    }
  }

  const savedInterface = parseInterfaceLocale(localStorage.getItem(INTERFACE_KEY))
  const savedResult = parseResultLanguage(localStorage.getItem(RESULT_KEY))

  return {
    interfaceLocale: savedInterface ?? detectBrowserInterfaceLocale(),
    resultLanguage: savedResult ?? DEFAULT_RESULT_LANGUAGE,
  }
}

export function saveInterfaceLocale(locale: LocalePreferences['interfaceLocale']): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INTERFACE_KEY, locale)
}

export function saveResultLanguage(language: LocalePreferences['resultLanguage']): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RESULT_KEY, language)
}
