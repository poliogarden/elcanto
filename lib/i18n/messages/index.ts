import { en } from '@/lib/i18n/messages/en'
import { ko } from '@/lib/i18n/messages/ko'
import type { InterfaceLocale } from '@/lib/i18n/types'

type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> }

export type Messages = DeepString<typeof en>

export const messages: Record<InterfaceLocale, Messages> = { en, ko }

export function getMessages(locale: InterfaceLocale): Messages {
  return messages[locale] ?? en
}
