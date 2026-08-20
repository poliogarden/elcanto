export type InterfaceLocale = 'en' | 'ko'

export type ResultLanguage = 'auto' | 'ko' | 'en'

export type ResolvedOutputLanguage = 'ko' | 'en'

export const INTERFACE_LOCALES: InterfaceLocale[] = ['en', 'ko']

export const RESULT_LANGUAGES: ResultLanguage[] = ['auto', 'ko', 'en']

export const DEFAULT_INTERFACE_LOCALE: InterfaceLocale = 'en'

export const DEFAULT_RESULT_LANGUAGE: ResultLanguage = 'auto'

export type LocalePreferences = {
  interfaceLocale: InterfaceLocale
  resultLanguage: ResultLanguage
}
