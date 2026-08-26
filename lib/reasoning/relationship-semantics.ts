import { grammarForRelationshipType } from '@/lib/visualization/visual-grammar'
import type { ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'

const GENERIC_PATTERNS: RegExp[] = [
  /\b(is|are|was|were)\s+(important|significant|influential|popular|discussed|beneficial|impactful|relevant)\b/i,
  /\b(has|have)\s+(impact|influence|presence|growth|momentum|attention)\b/i,
  /\b(is|are)\s+(gaining|growing|emerging|rising)\b/i,
  /\b(in|within)\s+(the\s+)?(industry|market|ai|discussion|conversation)\b/i,
  /\bgenerated\s+(significant|much|a lot of)\s+(discussion|attention|interest)\b/i,
]

const MECHANISM_MARKERS =
  /\b(because|therefore|reduces|enables|standardiz|protocol|mechanism|trade-?off|however|but|only after|complexity|integration|compatibility|flexibility|barrier|prerequisite)\b/i

const DIMENSION_KEYWORDS: Record<string, RegExp> = {
  integration: /\b(integrat|interop|compatib|connect|protocol|interface|api|tool)\b/i,
  adoption: /\b(adopt|adoption|ease of use|onboard|barrier|friction|setup|deploy|deployment|effective|capabilities)\b/i,
  significance: /\b(important|significant|influential|impact|presence|discussed|popular)\b/i,
  mechanism: /\b(mechanism|how it works|standardiz|protocol|architecture)\b/i,
  tradeoff: /\b(trade-?off|however|but|sacrifice|limitation|constraint|downside)\b/i,
  comparison: /\b(compare|versus|vs|alternative|compet)\b/i,
  outcome: /\b(outcome|result|effect|consequence|benefit|reduces|improves)\b/i,
}

function tokenize(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text))
}

export function inferDimension(
  rel: ReasoningRelationship,
  from?: ReasoningClaim,
  to?: ReasoningClaim,
): string {
  if (rel.dimension) return rel.dimension.toLowerCase()
  const text = `${rel.explanation} ${from?.statement ?? ''} ${to?.statement ?? ''}`
  for (const [dim, re] of Object.entries(DIMENSION_KEYWORDS)) {
    if (re.test(text)) return dim
  }
  return 'general'
}

export function assessGenericness(text: string): {
  generic: boolean
  score: number
  hasMechanism: boolean
} {
  const normalized = text.trim()
  if (!normalized) return { generic: true, score: 1, hasMechanism: false }
  const hasMechanism = MECHANISM_MARKERS.test(normalized)
  let hits = 0
  for (const re of GENERIC_PATTERNS) {
    if (re.test(normalized)) hits++
  }
  const shortAndVague = normalized.split(/\s+/).length <= 8 && hits > 0
  const score = Math.min(1, hits * 0.35 + (shortAndVague ? 0.25 : 0))
  const generic = score >= 0.35 && !hasMechanism
  return { generic, score, hasMechanism }
}

export function visualKindForRelationship(
  rel: ReasoningRelationship,
): 'agree' | 'divide' | 'trade-off' | 'neutral' {
  const kind = grammarForRelationshipType(rel.type).kind
  if (kind === 'agree' || kind === 'divide' || kind === 'trade-off') return kind
  return 'neutral'
}

export function stanceFamily(rel: ReasoningRelationship): string {
  const kind = visualKindForRelationship(rel)
  if (kind === 'divide') return 'divide'
  if (kind === 'trade-off') return 'tradeoff'
  if (kind === 'agree') return 'agree'
  return 'neutral'
}

const DEPLOYMENT_TOKENS = new Set([
  'deploy',
  'deployment',
  'adopt',
  'adoption',
  'integrat',
  'setup',
  'install',
  'config',
  'operational',
  'practical',
  'workflow',
  'rapid',
  'effective',
  'capability',
])

export type NormalizedProposition = {
  text: string
  subject: string
  predicate: string
  object: string
  dimension: string
  stance: 'positive' | 'negative' | 'neutral'
  generic: boolean
}

function extractSubject(text: string): string {
  const m = text.match(/\b(MCP|model context protocol|api|tool|server|agent)\b/i)
  return m ? m[1].toLowerCase() : 'topic'
}

function extractPredicate(text: string): string {
  const m = text.match(
    /\b(reduces?|enables?|supports?|provides?|standardizes?|simplifies?|increases?|improves?|allows?|creates?|offers?|requires?|is|are|has|have)\b/i,
  )
  return m ? m[1].toLowerCase() : 'relates'
}

function extractStance(text: string): 'positive' | 'negative' | 'neutral' {
  if (/\b(reduces?|enables?|simplifies?|improves?|easier|effective|benefit)\b/i.test(text)) {
    return 'positive'
  }
  if (/\b(increases?|harder|difficult|complex|barrier|concern|risk|worse)\b/i.test(text)) {
    return 'negative'
  }
  return 'neutral'
}

export function normalizeRelationshipProposition(
  rel: ReasoningRelationship,
  from?: ReasoningClaim,
  to?: ReasoningClaim,
): NormalizedProposition {
  const combined = `${rel.explanation} ${from?.statement ?? ''} ${to?.statement ?? ''}`.trim()
  const generic = assessGenericness(combined)
  const subject = extractSubject(combined)
  let predicate = extractPredicate(combined)
  const stance = extractStance(combined)

  let object = 'topic relevance'
  let dimension = inferDimension(rel, from, to)

  const deploymentHeavy = [...DEPLOYMENT_TOKENS].some((t) => combined.toLowerCase().includes(t))
  if (deploymentHeavy) {
    dimension = 'adoption'
    object = 'practical deployment/adoption'
    predicate = 'supports'
  } else {
    if (dimension === 'integration' || dimension === 'adoption') object = 'integration/adoption'
    if (dimension === 'mechanism') object = 'mechanism'
    if (dimension === 'outcome') object = 'outcome'
    if (dimension === 'significance') object = 'significance'
  }

  const text = `${subject} ${predicate} ${object} (${dimension}, ${stance})`

  return {
    text,
    subject,
    predicate,
    object,
    dimension,
    stance,
    generic: generic.generic,
  }
}

export function normalizedPropositionSimilarity(a: NormalizedProposition, b: NormalizedProposition): number {
  if (a.stance !== b.stance && a.stance !== 'neutral' && b.stance !== 'neutral') return 0
  if (a.subject !== b.subject && a.subject !== 'topic' && b.subject !== 'topic') return 0
  if (a.dimension !== b.dimension && a.dimension !== 'general' && b.dimension !== 'general') return 0

  const ta = tokenSet(a.text)
  const tb = tokenSet(b.text)
  let overlap = overlapRatio(ta, tb)

  if (a.generic && b.generic && a.subject === b.subject) overlap = Math.max(overlap, 0.55)
  if (a.dimension === b.dimension && a.dimension !== 'general') overlap = Math.max(overlap, 0.35)

  let deploymentHits = 0
  for (const t of DEPLOYMENT_TOKENS) {
    const inA = [...ta].some((w) => w.includes(t))
    const inB = [...tb].some((w) => w.includes(t))
    if (inA && inB) deploymentHits++
  }
  if (deploymentHits >= 2) overlap = Math.max(overlap, 0.5)

  return overlap
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

const INTEGRATION_TOKENS = new Set([
  'integrat',
  'interop',
  'compatib',
  'connect',
  'protocol',
  'interface',
  'standard',
  'tool',
  'api',
  'custom',
  'code',
  'easier',
  'simplif',
  'reduce',
])

export function propositionSimilarity(
  a: { explanation: string; dimension?: string; type: string },
  b: { explanation: string; dimension?: string; type: string },
  claimsA: ReasoningClaim[],
  claimsB: ReasoningClaim[],
): number {
  if (stanceFamily(a as ReasoningRelationship) !== stanceFamily(b as ReasoningRelationship)) {
    return 0
  }
  const dimA = a.dimension ?? inferDimension(a as ReasoningRelationship, claimsA[0], claimsA[1])
  const dimB = b.dimension ?? inferDimension(b as ReasoningRelationship, claimsB[0], claimsB[1])
  if (dimA !== dimB && dimA !== 'general' && dimB !== 'general') return 0

  const textA = tokenSet(`${a.explanation} ${claimsA.map((c) => c.statement).join(' ')}`)
  const textB = tokenSet(`${b.explanation} ${claimsB.map((c) => c.statement).join(' ')}`)
  if (textA.size === 0 || textB.size === 0) return 0
  let shared = 0
  for (const t of textA) if (textB.has(t)) shared++
  let overlap = shared / Math.min(textA.size, textB.size)

  let integrationHits = 0
  for (const t of INTEGRATION_TOKENS) {
    const inA = [...textA].some((w) => w.includes(t))
    const inB = [...textB].some((w) => w.includes(t))
    if (inA && inB) integrationHits++
  }
  if (integrationHits >= 2) overlap = Math.max(overlap, 0.45)

  for (const t of DEPLOYMENT_TOKENS) {
    const inA = [...textA].some((w) => w.includes(t))
    const inB = [...textB].some((w) => w.includes(t))
    if (inA && inB) overlap = Math.max(overlap, 0.42)
  }

  return overlap
}

export function claimsForRelationship(
  rel: ReasoningRelationship,
  claimById: Map<string, ReasoningClaim>,
): ReasoningClaim[] {
  const from = claimById.get(rel.fromClaimId)
  const to = claimById.get(rel.toClaimId)
  return [from, to].filter((c): c is ReasoningClaim => Boolean(c))
}

export function pickCanonicalText(
  texts: string[],
): string {
  const scored = texts
    .map((t) => ({
      t,
      generic: assessGenericness(t),
      len: t.length,
    }))
    .sort((a, b) => {
      if (a.generic.generic !== b.generic.generic) return a.generic.generic ? 1 : -1
      if (a.generic.hasMechanism !== b.generic.hasMechanism) return a.generic.hasMechanism ? -1 : 1
      return b.len - a.len
    })
  return scored[0]?.t ?? texts[0] ?? ''
}

export function dynamicClusterLabel(canonicalClaim: string, dimension: string): string {
  const short =
    canonicalClaim.length > 72 ? `${canonicalClaim.slice(0, 70)}…` : canonicalClaim
  if (dimension === 'general') return short
  const dimLabel = dimension.replace(/_/g, ' ')
  return short.length < 40 ? `${dimLabel}: ${short}` : short
}
