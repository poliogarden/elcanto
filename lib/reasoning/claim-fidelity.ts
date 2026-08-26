import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type ClaimScope =
  | 'speaker'
  | 'personal'
  | 'example'
  | 'general'
  | 'industry'
  | 'market'

export type ClaimFidelityStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'OVERSTATED'
  | 'UNSUPPORTED'

export type ClaimMutationKind =
  | 'OBSERVATION_TO_FACT'
  | 'POSSIBILITY_TO_CERTAINTY'
  | 'CORRELATION_TO_CAUSATION'
  | 'EXAMPLE_TO_UNIVERSAL'
  | 'PERSONAL_TO_UNIVERSAL'
  | 'POPULARITY_TO_EFFECTIVENESS'
  | 'EASE_TO_ADOPTION'
  | 'CAPABILITY_TO_DOMINANCE'
  | 'SCOPE_ESCALATION'
  | 'SEMANTIC_INFLATION'

export type ClaimFidelityResult = {
  status: ClaimFidelityStatus
  scope: ClaimScope
  strength: 'strong' | 'moderate' | 'weak'
  mutations: ClaimMutationKind[]
  suggestedStatement?: string
  reason?: string
}

const CAUSAL_MARKERS =
  /\b(because|therefore|thus|leads to|results in|drives?|causes?|attributable to|due to|as a result|so that)\b/i

const MARKET_WIDE =
  /\b(market|industry|ecosystem|worldwide|everyone|dominat(e|es|ing)|dominance|penetrat|hot topic|almost completely)\b/i

const SPEAKER_OBSERVATION =
  /\b(i've|i have|i'm seeing|i see|i found|i think|in my experience|lately|recently|a lot more|lots of)\b/i

const MODAL_WEAK = /\b(may|might|could|possibly|perhaps|seems?|appears?)\b/i

const MODAL_STRONG = /\b(will|must|definitely|clearly|always|never|dominates?|completely)\b/i

function tokenize(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function overlapRatio(a: string, b: string): number {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

function inferScopeFromEvidence(evidenceText: string): ClaimScope {
  const t = evidenceText.toLowerCase()
  if (SPEAKER_OBSERVATION.test(t)) return 'speaker'
  if (/\b(my |i |we |our )/i.test(t)) return 'personal'
  if (MARKET_WIDE.test(t)) return 'market'
  if (/\b(industry|companies|developers|teams)\b/i.test(t)) return 'industry'
  if (/\b(for example|one case|instance)\b/i.test(t)) return 'example'
  return 'general'
}

function inferScopeFromClaim(claimText: string): ClaimScope {
  const t = claimText.toLowerCase()
  if (/\b(the speaker|speaker observes|speaker describes|speaker found)\b/i.test(t)) return 'speaker'
  if (MARKET_WIDE.test(t) || /\bdominat/i.test(t)) return 'market'
  if (/\b(industry|ecosystem)\b/i.test(t)) return 'industry'
  if (/\b(i found|i've|personal)\b/i.test(t)) return 'personal'
  return 'general'
}

function scopeRank(scope: ClaimScope): number {
  const order: ClaimScope[] = ['speaker', 'personal', 'example', 'general', 'industry', 'market']
  return order.indexOf(scope)
}

function detectMutations(
  claimText: string,
  evidenceText: string,
): ClaimMutationKind[] {
  const mutations: ClaimMutationKind[] = []
  const claim = claimText.toLowerCase()
  const evidence = evidenceText.toLowerCase()

  const evidenceScope = inferScopeFromEvidence(evidenceText)
  const claimScope = inferScopeFromClaim(claimText)
  if (scopeRank(claimScope) > scopeRank(evidenceScope) + 1) {
    mutations.push('SCOPE_ESCALATION')
  }

  if (SPEAKER_OBSERVATION.test(evidence) && MARKET_WIDE.test(claim)) {
    mutations.push('OBSERVATION_TO_FACT')
  }

  if (MODAL_WEAK.test(evidence) && !MODAL_WEAK.test(claim) && MODAL_STRONG.test(claim)) {
    mutations.push('POSSIBILITY_TO_CERTAINTY')
  }
  if (MODAL_WEAK.test(evidence) && /\b(is|are|makes?|provides?)\b/i.test(claim) && !MODAL_WEAK.test(claim)) {
    mutations.push('POSSIBILITY_TO_CERTAINTY')
  }

  const claimCausal = CAUSAL_MARKERS.test(claim)
  const evidenceCausal = CAUSAL_MARKERS.test(evidence)
  if (claimCausal && !evidenceCausal) {
    mutations.push('CORRELATION_TO_CAUSATION')
  }

  if (/\b(i |my |i've|i found)\b/i.test(evidence) && !/\b(speaker|i |my )\b/i.test(claim)) {
    if (/\b(is|are|provides?|enables?)\b/i.test(claim)) {
      mutations.push('PERSONAL_TO_UNIVERSAL')
    }
  }

  if (/\b(popular|trending|hot topic|discussion)\b/i.test(evidence) && /\b(effective|better|superior|outperform)\b/i.test(claim)) {
    mutations.push('POPULARITY_TO_EFFECTIVENESS')
  }

  if (/\b(easy|simple|straightforward|user.?friendly)\b/i.test(evidence) && /\b(adopt|adoption|dominat|penetrat|market)\b/i.test(claim)) {
    mutations.push('EASE_TO_ADOPTION')
  }

  if (/\b(capability|feature|function|integrat)\b/i.test(evidence) && /\b(dominat|penetrat|market leader|outperform)\b/i.test(claim)) {
    mutations.push('CAPABILITY_TO_DOMINANCE')
  }

  if (claim.length > evidence.length * 2 && overlapRatio(claimText, evidenceText) < 0.3) {
    mutations.push('SEMANTIC_INFLATION')
  }

  return mutations
}

function buildSpeakerObservationStatement(evidenceText: string): string {
  const trimmed = evidenceText.trim()
  if (trimmed.length < 200) {
    return `The speaker observes: ${trimmed}`
  }
  return `The speaker observes: ${trimmed.slice(0, 180)}…`
}

export function assessClaimFidelity(
  claim: ReasoningClaim,
  evidenceText: string,
): ClaimFidelityResult {
  if (!evidenceText.trim()) {
    return {
      status: 'UNSUPPORTED',
      scope: 'general',
      strength: 'weak',
      mutations: [],
      reason: 'No evidence text for fidelity check.',
    }
  }

  const mutations = detectMutations(claim.statement, evidenceText)
  const evidenceScope = inferScopeFromEvidence(evidenceText)
  const claimScope = inferScopeFromClaim(claim.statement)
  const overlap = overlapRatio(claim.statement, evidenceText)

  const severeMutations: ClaimMutationKind[] = [
    'CORRELATION_TO_CAUSATION',
    'CAPABILITY_TO_DOMINANCE',
    'SCOPE_ESCALATION',
    'OBSERVATION_TO_FACT',
    'PERSONAL_TO_UNIVERSAL',
    'EASE_TO_ADOPTION',
    'SEMANTIC_INFLATION',
    'POSSIBILITY_TO_CERTAINTY',
  ]

  const hasSevere = mutations.some((m) => severeMutations.includes(m))
  const hasMild = mutations.length > 0

  let strength: ClaimFidelityResult['strength'] = 'moderate'
  if (MODAL_STRONG.test(claim.statement) && !MODAL_STRONG.test(evidenceText)) strength = 'weak'
  if (overlap >= 0.45 && !hasSevere) strength = 'strong'

  if (hasSevere) {
    const suggested =
      evidenceScope === 'speaker' || evidenceScope === 'personal'
        ? buildSpeakerObservationStatement(evidenceText)
        : undefined
    return {
      status: 'OVERSTATED',
      scope: claimScope,
      strength: 'weak',
      mutations,
      suggestedStatement: suggested,
      reason: `Claim exceeds evidence: ${mutations.join(', ')}`,
    }
  }

  if (overlap < 0.12) {
    return {
      status: 'UNSUPPORTED',
      scope: claimScope,
      strength: 'weak',
      mutations,
      reason: 'Claim has insufficient overlap with evidence text.',
    }
  }

  if (hasMild || overlap < 0.28) {
    const suggested =
      evidenceScope === 'speaker' || SPEAKER_OBSERVATION.test(evidenceText)
        ? buildSpeakerObservationStatement(evidenceText)
        : claim.statement
    return {
      status: 'PARTIALLY_SUPPORTED',
      scope: evidenceScope,
      strength: 'moderate',
      mutations,
      suggestedStatement: suggested,
      reason: hasMild ? `Partial fidelity: ${mutations.join(', ')}` : 'Moderate evidence overlap.',
    }
  }

  return {
    status: 'SUPPORTED',
    scope: evidenceScope,
    strength,
    mutations: [],
  }
}

export function fidelityBlocksGeneration(status: ClaimFidelityStatus): boolean {
  return status === 'OVERSTATED' || status === 'UNSUPPORTED'
}
