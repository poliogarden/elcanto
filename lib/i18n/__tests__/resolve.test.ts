import { describe, expect, it } from 'vitest'
import { resolveResultLanguage, detectBrowserInterfaceLocale } from '@/lib/i18n/resolve'

describe('i18n resolve', () => {
  it('auto follows interface locale', () => {
    expect(resolveResultLanguage('auto', 'ko')).toBe('ko')
    expect(resolveResultLanguage('auto', 'en')).toBe('en')
  })

  it('explicit result language overrides interface', () => {
    expect(resolveResultLanguage('en', 'ko')).toBe('en')
    expect(resolveResultLanguage('ko', 'en')).toBe('ko')
  })
})
