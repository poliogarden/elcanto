import type {
  InterfaceLocale,
  ResolvedOutputLanguage,
  ResultLanguage,
} from '@/lib/i18n/types'
import { DEFAULT_INTERFACE_LOCALE } from '@/lib/i18n/types'

export function resolveResultLanguage(
  resultLanguage: ResultLanguage,
  interfaceLocale: InterfaceLocale,
): ResolvedOutputLanguage {
  if (resultLanguage === 'ko' || resultLanguage === 'en') return resultLanguage
  return interfaceLocale
}

export function detectBrowserInterfaceLocale(): InterfaceLocale {
  if (typeof navigator === 'undefined') return DEFAULT_INTERFACE_LOCALE
  const lang = navigator.language?.toLowerCase() ?? ''
  if (lang.startsWith('ko')) return 'ko'
  return 'en'
}

export function parseInterfaceLocale(value: unknown): InterfaceLocale | null {
  if (value === 'ko' || value === 'en') return value
  return null
}

export function parseResultLanguage(value: unknown): ResultLanguage | null {
  if (value === 'auto' || value === 'ko' || value === 'en') return value
  return null
}

export function outputLanguageLabel(lang: ResolvedOutputLanguage): string {
  return lang === 'ko' ? 'Korean' : 'English'
}
