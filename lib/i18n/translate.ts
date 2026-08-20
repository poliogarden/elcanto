import { en } from '@/lib/i18n/messages/en'
import type { InterfaceLocale } from '@/lib/i18n/types'
import { getMessages } from '@/lib/i18n/messages'

type Params = Record<string, string | number>

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value !== undefined ? String(value) : `{${key}}`
  })
}

export function translate(
  locale: InterfaceLocale,
  key: string,
  params?: Params,
): string {
  const tree = getMessages(locale) as Record<string, unknown>
  const value = getNested(tree, key)

  if (typeof value === 'string') {
    return interpolate(value, params)
  }

  if (process.env.NODE_ENV !== 'production') {
    const fallback = getNested(en as unknown as Record<string, unknown>, key)
    if (typeof fallback === 'string') {
      return interpolate(fallback, params)
    }
    console.warn(`[i18n] Missing key: ${key}`)
  }

  return key
}

export function t(locale: InterfaceLocale, key: string, params?: Params): string {
  return translate(locale, key, params)
}
