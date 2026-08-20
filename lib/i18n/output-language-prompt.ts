import type { ResolvedOutputLanguage } from '@/lib/i18n/types'

export function buildOutputLanguageInstruction(lang: ResolvedOutputLanguage): string {
  if (lang === 'ko') {
    return `OUTPUT LANGUAGE: Korean (한국어).
Write ALL user-facing text fields in natural Korean — emergentStatement, bottomLine, insights, section statements, editorial comparisons, theme titles, gap questions, and answer text.
Do NOT produce English synthesis and translate. Reason directly in Korean.
Keep sourceId, claimId, evidenceId, and JSON keys in English.`
  }

  return `OUTPUT LANGUAGE: English.
Write ALL user-facing text fields in clear editorial English.
Keep sourceId, claimId, evidenceId, and JSON keys unchanged.`
}
