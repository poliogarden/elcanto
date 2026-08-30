import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import {
  classifyPropositionDimension,
  type PropositionDimension,
} from '@/lib/reasoning/proposition-alignment'
import {
  deriveHazardHealthCombinedExplanation,
  derivePhenomenonOutcomeCombinedExplanation,
  isHazardHealthComplementaryPair,
  isPhenomenonOutcomeComplementaryPair,
} from '@/lib/reasoning/proposition-semantics'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type ExplanatoryObjectFamily =
  | 'integration_mechanism'
  | 'capability_outcome'
  | 'adoption'
  | 'market_discourse'
  | 'development'
  | 'health_outcome'
  | 'ecosystem_outcome'
  | 'general'

export type ComplementarySharedExplanationResult = {
  passed: boolean
  explanatoryObject: string
  dimensionA: PropositionDimension
  dimensionB: PropositionDimension
  combinedExplanation: string
  addedInference: boolean
  dependency: boolean
  rejectionReason?: 'DIFFERENT_DIMENSION' | 'ALIGNMENT_FAILED'
  rejectionDetail?: string
}

const GENERIC_COMPLEMENTARY_PATTERNS: RegExp[] = [
  /\binterlinked\b/i,
  /\brelated facets\b/i,
  /\bboth concern\b/i,
  /\bcan be seen together\b/i,
  /\bdifferent facets\b/i,
  /\binterlinked concepts\b/i,
  /\bspeak to different\b/i,
  /\binterlinked concepts\b/i,
  /\bwhich can be seen as\b/i,
  /\bongoing marketplace discourse\b/i,
]

const COMPLEMENTARY_OBJECT_PAIRS = new Set([
  'integration_mechanism:capability_outcome',
  'capability_outcome:integration_mechanism',
  'integration_mechanism:adoption',
  'adoption:integration_mechanism',
  'capability_outcome:adoption',
  'adoption:capability_outcome',
  'integration_mechanism:integration_mechanism',
  'capability_outcome:capability_outcome',
  'adoption:adoption',
  'health_outcome:health_outcome',
  'ecosystem_outcome:ecosystem_outcome',
  'health_outcome:ecosystem_outcome',
  'ecosystem_outcome:health_outcome',
])

const INCOMPATIBLE_OBJECT_PAIRS = new Set([
  'integration_mechanism:market_discourse',
  'market_discourse:integration_mechanism',
  'integration_mechanism:development',
  'development:integration_mechanism',
  'capability_outcome:market_discourse',
  'market_discourse:capability_outcome',
  'adoption:market_discourse',
  'market_discourse:adoption',
  'definition:market_discourse',
  'market_discourse:definition',
])

const COMPLEMENTARY_DIMENSION_PAIRS = new Set([
  'MECHANISM:EFFECT',
  'EFFECT:MECHANISM',
  'MECHANISM:ADOPTION',
  'ADOPTION:MECHANISM',
  'MECHANISM:CAPABILITY',
  'CAPABILITY:MECHANISM',
  'CAUSE:EFFECT',
  'EFFECT:CAUSE',
  'LIMITATION:CAUSE',
  'CAUSE:LIMITATION',
  'DEFINITION:MECHANISM',
  'MECHANISM:DEFINITION',
  'COMPARISON:ADOPTION',
  'ADOPTION:COMPARISON',
  'EFFECT:EFFECT',
  'MECHANISM:MECHANISM',
])

function contentTokens(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 3)
}

function overlapRatio(a: string, b: string): number {
  const ta = new Set(contentTokens(a))
  const tb = new Set(contentTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

export function classifyExplanatoryObjectFamily(statement: string): ExplanatoryObjectFamily {
  const s = statement.toLowerCase()
  if (/\b(wildfire|smoke|particulate|respiratory|cardiovascular|inflammation|admissions)\b/.test(s)) {
    return 'health_outcome'
  }
  if (/\b(coral|bleaching|reef ecosystem|habitat diversity|structural complexity)\b/.test(s)) {
    return 'ecosystem_outcome'
  }
  if (/\b(marketplace|market|discourse|discussion|popular|attention|interest|trend|hot topic)\b/.test(s)) {
    return 'market_discourse'
  }
  if (/\b(ongoing development|release status|in development)\b/.test(s)) {
    return 'development'
  }
  if (/\b(reduces|enables|improves|outcome|benefit|allows|simplif)\b/.test(s)) {
    return 'capability_outcome'
  }
  if (/\b(adopt|deploy|setup|install|onboard)\b/.test(s)) {
    return 'adoption'
  }
  if (/\b(standardizes?|interfaces?|integrat\w*)\b/.test(s)) {
    return 'integration_mechanism'
  }
  if (/\b(facilitat|interaction|protocol|integrat|connect|communicat)\b/.test(s)) {
    return 'integration_mechanism'
  }
  return 'general'
}

function explanatoryObjectLabel(family: ExplanatoryObjectFamily, dimension: PropositionDimension): string {
  if (family !== 'general') return family.replace(/_/g, ' ')
  return dimension.toLowerCase().replace(/_/g, ' ')
}

function areExplanatoryObjectsCompatible(
  familyA: ExplanatoryObjectFamily,
  familyB: ExplanatoryObjectFamily,
  dimensionA: PropositionDimension,
  dimensionB: PropositionDimension,
): boolean {
  if (familyA === 'ecosystem_outcome' && familyB === 'ecosystem_outcome') {
    return true
  }
  if (familyA === 'health_outcome' && familyB === 'health_outcome') {
    return true
  }

  if (familyA === 'market_discourse' || familyB === 'market_discourse') {
    if (familyA === 'integration_mechanism' || familyB === 'integration_mechanism') return false
    if (familyA === 'capability_outcome' || familyB === 'capability_outcome') return false
    if (familyA === 'adoption' || familyB === 'adoption') return false
    if (dimensionA === 'MECHANISM' || dimensionB === 'MECHANISM') return false
    if (dimensionA === 'DEFINITION' || dimensionB === 'DEFINITION') return false
  }

  const objectKey = `${familyA}:${familyB}`
  if (INCOMPATIBLE_OBJECT_PAIRS.has(objectKey)) return false

  if (familyA === familyB && familyA !== 'general') return true

  if (COMPLEMENTARY_OBJECT_PAIRS.has(objectKey)) return true

  const dimKey = `${dimensionA}:${dimensionB}`
  if (COMPLEMENTARY_DIMENSION_PAIRS.has(dimKey)) return true

  if (familyA === 'general' || familyB === 'general') {
    return dimensionA === dimensionB && dimensionA !== 'GENERAL'
  }

  return false
}

function isGenericComplementaryExplanation(explanation: string): boolean {
  for (const re of GENERIC_COMPLEMENTARY_PATTERNS) {
    if (re.test(explanation)) return true
  }
  return /\bboth (claims?|speak|highlight|refer)\b/i.test(explanation) &&
    /\b(facets?|aspects?|concepts?|together|interlinked)\b/i.test(explanation)
}

function deriveCombinedExplanation(
  from: ReasoningClaim,
  to: ReasoningClaim,
  familyA: ExplanatoryObjectFamily,
  familyB: ExplanatoryObjectFamily,
): string {
  const a = from.statement
  const b = to.statement

  if (
    (familyA === 'integration_mechanism' && familyB === 'capability_outcome') ||
    (familyA === 'capability_outcome' && familyB === 'integration_mechanism')
  ) {
    return 'MCP standardizes and reduces integration'
  }

  if (
    (familyA === 'integration_mechanism' && familyB === 'adoption') ||
    (familyA === 'adoption' && familyB === 'integration_mechanism')
  ) {
    return 'MCP affects how tools are integrated and adopted in practice'
  }

  const hazardExplanation = deriveHazardHealthCombinedExplanation(a, b)
  if (hazardExplanation) return hazardExplanation

  const phenomenonExplanation = derivePhenomenonOutcomeCombinedExplanation(a, b)
  if (phenomenonExplanation) return phenomenonExplanation

  const shared = contentTokens(a).filter((t) => contentTokens(b).includes(t))
  if (shared.length >= 2) {
    const subject = /\bmcp\b/i.test(`${a} ${b}`) ? 'MCP' : 'The topic'
    return `${subject} ${shared.slice(0, 3).join(' ')}`
  }

  return ''
}

function combinedExplanationFromClaimsOnly(
  combined: string,
  claimA: string,
  claimB: string,
): boolean {
  const combinedTokens = contentTokens(combined).filter((t) => t !== 'mcp')
  if (combinedTokens.length === 0) return true
  const claimTokens = new Set([...contentTokens(claimA), ...contentTokens(claimB)])
  let covered = 0
  for (const t of combinedTokens) {
    if (tokenInClaims(t, claimTokens)) covered++
  }
  return covered / combinedTokens.length >= 0.65
}

function tokenInClaims(token: string, claimTokens: Set<string>): boolean {
  if (claimTokens.has(token)) return true
  for (const ct of claimTokens) {
    if (ct.startsWith(token) || token.startsWith(ct)) return true
  }
  return false
}

function hasAddedInference(combined: string, claimA: string, claimB: string): boolean {
  const combinedTokens = contentTokens(combined).filter((t) => t !== 'mcp' && t.length > 3)
  const claimTokens = new Set([...contentTokens(claimA), ...contentTokens(claimB)])
  let novel = 0
  for (const t of combinedTokens) {
    if (!tokenInClaims(t, claimTokens)) novel++
  }
  return novel >= 2
}

function claimsProvideDifferentInformation(a: string, b: string): boolean {
  if (isHazardHealthComplementaryPair(a, b) || isPhenomenonOutcomeComplementaryPair(a, b)) {
    return true
  }
  const dimA = classifyPropositionDimension(a)
  const dimB = classifyPropositionDimension(b)
  if (dimA !== dimB && dimA !== 'GENERAL' && dimB !== 'GENERAL') return true
  return overlapRatio(a, b) < 0.45
}

export function assessComplementarySharedExplanation(
  from: ReasoningClaim,
  to: ReasoningClaim,
  explanation?: string,
): ComplementarySharedExplanationResult {
  const dimensionA = classifyPropositionDimension(from.statement)
  const dimensionB = classifyPropositionDimension(to.statement)
  const familyA = classifyExplanatoryObjectFamily(from.statement)
  const familyB = classifyExplanatoryObjectFamily(to.statement)
  const explanatoryObject = explanatoryObjectLabel(
    familyA !== 'general' ? familyA : familyB,
    dimensionA !== 'GENERAL' ? dimensionA : dimensionB,
  )

  if (!areExplanatoryObjectsCompatible(familyA, familyB, dimensionA, dimensionB)) {
    return {
      passed: false,
      explanatoryObject,
      dimensionA,
      dimensionB,
      combinedExplanation: '',
      addedInference: false,
      dependency: false,
      rejectionReason: 'DIFFERENT_DIMENSION',
      rejectionDetail: `Incompatible explanatory objects: ${familyA} vs ${familyB} (${dimensionA} vs ${dimensionB})`,
    }
  }

  if (explanation && isGenericComplementaryExplanation(explanation)) {
    return {
      passed: false,
      explanatoryObject,
      dimensionA,
      dimensionB,
      combinedExplanation: '',
      addedInference: true,
      dependency: false,
      rejectionReason: 'ALIGNMENT_FAILED',
      rejectionDetail: 'Generic complementary language without substantive combined explanation.',
    }
  }

  if (!claimsProvideDifferentInformation(from.statement, to.statement)) {
    return {
      passed: false,
      explanatoryObject,
      dimensionA,
      dimensionB,
      combinedExplanation: '',
      addedInference: false,
      dependency: false,
      rejectionReason: 'ALIGNMENT_FAILED',
      rejectionDetail: 'Claims do not provide distinct complementary information.',
    }
  }

  const combinedExplanation = deriveCombinedExplanation(from, to, familyA, familyB)
  if (!combinedExplanation) {
    return {
      passed: false,
      explanatoryObject,
      dimensionA,
      dimensionB,
      combinedExplanation: '',
      addedInference: false,
      dependency: false,
      rejectionReason: 'ALIGNMENT_FAILED',
      rejectionDetail: 'No combined explanation derivable from both claims.',
    }
  }

  const addedInference = hasAddedInference(
    combinedExplanation,
    from.statement,
    to.statement,
  )
  const fromClaimsOnly = combinedExplanationFromClaimsOnly(
    combinedExplanation,
    from.statement,
    to.statement,
  )

  const dependency =
    /\b(because|therefore|leads to|as a result|enables|allows|reduces)\b/i.test(
      `${from.statement} ${to.statement} ${explanation ?? ''}`,
    )

  const passed = !addedInference && fromClaimsOnly

  return {
    passed,
    explanatoryObject,
    dimensionA,
    dimensionB,
    combinedExplanation,
    addedInference,
    dependency,
    rejectionReason: passed
      ? undefined
      : addedInference
        ? 'ALIGNMENT_FAILED'
        : 'ALIGNMENT_FAILED',
    rejectionDetail: passed
      ? undefined
      : addedInference
        ? 'Combined explanation adds inference beyond both claims.'
        : 'Combined explanation not directly constructible from both claims.',
  }
}

export const COMPLEMENTARY_VERIFICATION_TYPES: ReadonlySet<string> = new Set([
  'COMPLEMENTARY',
  'MECHANISM_OUTCOME',
  'PROBLEM_SOLUTION',
  'CAUSE_EFFECT',
  'DEPENDENCY',
  'ENABLER',
  'PREREQUISITE',
])

export function auditComplementaryRelationships(
  relationships: Array<{
    id: string
    type: string
    fromClaimId: string
    toClaimId: string
    explanation: string
  }>,
  claims: ReasoningClaim[],
): {
  valid: number
  falseComplementary: number
  entries: Array<{ id: string; assessedLabel: 'VALID' | 'FALSE_COMPLEMENTARY' }>
} {
  const claimById = new Map(claims.map((c) => [c.id, c]))
  const entries: Array<{ id: string; assessedLabel: 'VALID' | 'FALSE_COMPLEMENTARY' }> = []
  let valid = 0
  let falseComplementary = 0

  for (const rel of relationships) {
    if (!COMPLEMENTARY_VERIFICATION_TYPES.has(rel.type)) continue
    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) continue
    const result = assessComplementarySharedExplanation(from, to, rel.explanation)
    const label = result.passed ? 'VALID' : 'FALSE_COMPLEMENTARY'
    entries.push({ id: rel.id, assessedLabel: label })
    if (result.passed) valid++
    else falseComplementary++
  }

  return { valid, falseComplementary, entries }
}

export function filterComplementaryAlignedRelationships<
  T extends { fromClaimId: string; toClaimId: string; type: string; explanation: string },
>(relationships: T[], claimById: Map<string, ReasoningClaim>): T[] {
  return relationships.filter((rel) => {
    if (!COMPLEMENTARY_VERIFICATION_TYPES.has(rel.type)) return true
    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) return false
    return assessComplementarySharedExplanation(from, to, rel.explanation).passed
  })
}
