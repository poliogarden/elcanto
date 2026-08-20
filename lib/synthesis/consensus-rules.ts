import type { SynthesisPoint, SynthesisSectionType } from '@/lib/types/relationship'

/** Strength thresholds — tune via config */
export const RELATIONSHIP_STRENGTH = {
  strongMin: 0.8,
  moderateMin: 0.55,
  weakMin: 0.3,
} as const

export function strengthLabel(strength: number): string {
  if (strength >= RELATIONSHIP_STRENGTH.strongMin) return 'strong'
  if (strength >= RELATIONSHIP_STRENGTH.moderateMin) return 'moderate'
  if (strength >= RELATIONSHIP_STRENGTH.weakMin) return 'weak'
  return 'none'
}

export function isMeaningfulRelationship(strength: number): boolean {
  return strength >= RELATIONSHIP_STRENGTH.weakMin
}

/**
 * Coverage ≠ Agreement
 * 3/3 → CONSENSUS, 2/3 → SHARED VIEW, 1/3 → UNIQUE VIEW, 0 → omit
 */
export function consensusLabel(
  supportCount: number,
  totalSources: number,
): 'consensus' | 'shared_view' | 'unique_view' | null {
  if (totalSources < 2) return supportCount === 1 ? 'unique_view' : null
  if (supportCount === totalSources) return 'consensus'
  if (supportCount >= 2) return 'shared_view'
  if (supportCount === 1) return 'unique_view'
  return null
}

const SECTION_HEADINGS: Record<SynthesisSectionType, string> = {
  agreement: 'WHERE THEY AGREE',
  disagreement: 'WHERE THEY DISAGREE',
  shared_thread: 'SHARED THREAD',
  different_directions: 'DIFFERENT DIRECTIONS',
  unique_view: 'UNIQUE VIEW',
  hidden_connection: 'HIDDEN CONNECTION',
}

export function headingForSection(
  section: SynthesisSectionType,
  supportCount: number,
  totalSources: number,
): string {
  const kind = consensusLabel(supportCount, totalSources)
  if (section === 'agreement' && kind === 'shared_view') return SECTION_HEADINGS.shared_thread
  if (section === 'agreement' && kind === 'unique_view') return SECTION_HEADINGS.unique_view
  if (section === 'agreement' && kind === 'consensus') return SECTION_HEADINGS.agreement
  return SECTION_HEADINGS[section] ?? section.toUpperCase()
}

/** Reclassify and filter LLM sections — no forced consensus */
export function normalizeSynthesisSections(
  sections: SynthesisPoint[],
  totalSources: number,
): SynthesisPoint[] {
  const normalized: SynthesisPoint[] = []

  for (const section of sections) {
    const supportCount = section.sourceIds.length
    const kind = consensusLabel(supportCount, totalSources)

    // Drop fake consensus: 1-of-N labeled as agreement
    if (section.section === 'agreement' && kind === 'unique_view') {
      normalized.push({
        ...section,
        section: 'unique_view',
        label: SECTION_HEADINGS.unique_view,
        supportCount,
        totalSources,
      })
      continue
    }

    if (section.section === 'agreement' && kind === 'shared_view') {
      normalized.push({
        ...section,
        section: 'shared_thread',
        label: SECTION_HEADINGS.shared_thread,
        supportCount,
        totalSources,
      })
      continue
    }

    // Drop agreement with 0 sources or meaningless strength
    if (section.section === 'agreement' && supportCount < 2) continue

    normalized.push({
      ...section,
      label: headingForSection(section.section, supportCount, totalSources),
      supportCount,
      totalSources,
    })
  }

  return normalized
}

const GENERIC_PATTERNS = [
  /technology is changing/i,
  /innovation creates opportunity/i,
  /the future will be different/i,
  /ai is becoming important/i,
  /shaping the future/i,
  /transforming the world/i,
]

export function isTooGeneric(statement: string): boolean {
  return GENERIC_PATTERNS.some((p) => p.test(statement))
}

export function filterGenericSections(sections: SynthesisPoint[]): SynthesisPoint[] {
  return sections.filter((s) => !isTooGeneric(s.statement))
}
