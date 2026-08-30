import { pairKey } from '@/lib/reasoning/alignment'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import {
  isHazardHealthComplementaryPair,
  isNullEffectOpposition,
  isNumericRangeEquivalent,
  isOpposingDirectionPair,
  isPhenomenonOutcomeComplementaryPair,
  hasSemanticPredicateCompatibility,
} from '@/lib/reasoning/proposition-semantics'
import type {
  ConfidenceLevel,
  DiscoveryLevel,
  ReasoningClaim,
  ReasoningRelationshipType,
  RelationshipCandidate,
} from '@/lib/reasoning/types'

const DIMENSION_KEYWORDS: Record<string, RegExp> = {
  technical_capability: /\b(capability|feature|function|protocol|standard|api|tool)\b/i,
  usability: /\b(usability|user-friendly|easy|difficult|struggle|friction)\b/i,
  adoption: /\b(adoption|adopt|deploy|rollout|resist|switch|workflow)\b/i,
  cost: /\b(cost|expensive|cheap|budget|price)\b/i,
  complexity: /\b(complex|complexity|simple|simplify|fragmented|integration)\b/i,
  performance: /\b(performance|speed|latency|throughput|fast|slow)\b/i,
  compatibility: /\b(compatible|compatibility|interoperab|integrat)\b/i,
  organizational_friction: /\b(organization|team|workflow|change|resist|culture)\b/i,
  implementation: /\b(implement|deploy|setup|configure|operational)\b/i,
  risk: /\b(risk|danger|concern|security|vulnerab)\b/i,
  scalability: /\b(scale|scalab|growth|enterprise)\b/i,
}

const PROBLEM_MARKERS =
  /\b(struggle|difficult|challenge|problem|fragmented|friction|barrier|lack|without|hard to|cannot|fail)\b/i
const SOLUTION_MARKERS =
  /\b(provides|enables|simplifies|reduces|solves|allows|creates|offers|common protocol|standardizes)\b/i
const MECHANISM_MARKERS =
  /\b(standardizes|protocol|mechanism|through|by|via|because|enables communication)\b/i
const OUTCOME_MARKERS =
  /\b(less|more|fewer|easier|faster|reduces|increases|need less|can integrate)\b/i
const POSITIVE_MARKERS = /\b(reduces|simplifies|easier|improves|enables|benefit|advantage)\b/i
const NEGATIVE_MARKERS =
  /\b(increases|harder|worse|complex|difficult|concern|risk|resist|barrier)\b/i

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeStatement(text)
      .split(/\W+/)
      .filter((w) => w.length >= 3),
  )
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

export function extractDimensions(statement: string): string[] {
  const dims: string[] = []
  for (const [dim, re] of Object.entries(DIMENSION_KEYWORDS)) {
    if (re.test(statement)) dims.push(dim)
  }
  return dims
}

export function extractSharedDimension(a: string, b: string): string | undefined {
  const dimsA = extractDimensions(a)
  const dimsB = extractDimensions(b)
  return dimsA.find((d) => dimsB.includes(d))
}

function crossSourcePairs(claims: ReasoningClaim[]): Array<[ReasoningClaim, ReasoningClaim]> {
  const pairs: Array<[ReasoningClaim, ReasoningClaim]> = []
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      if (claims[i].sourceId !== claims[j].sourceId) {
        pairs.push([claims[i], claims[j]])
      }
    }
  }
  return pairs
}

const TOPIC_BRIDGE =
  /\b(mcp|protocol|model context|integration|integrat|api|tool|server|agent|capability|connect|external)\b/i

function conceptOrTopicBridge(from: ReasoningClaim, to: ReasoningClaim): boolean {
  const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))
  if (sharedConcepts.length > 0) return true
  if (TOPIC_BRIDGE.test(from.statement) && TOPIC_BRIDGE.test(to.statement)) return true
  const dimension = extractSharedDimension(from.statement, to.statement)
  return Boolean(dimension)
}

/** High-recall bridge candidates — type is provisional; verification decides. */
export function discoverTopicBridgeCandidates(claims: ReasoningClaim[]): RelationshipCandidate[] {
  const map = new Map<string, RelationshipCandidate>()
  for (const [from, to] of crossSourcePairs(claims)) {
    if (!conceptOrTopicBridge(from, to)) continue
    const fromTokens = tokenSet(from.statement)
    const toTokens = tokenSet(to.statement)
    const overlap = overlapRatio(fromTokens, toTokens)
    const dimension = extractSharedDimension(from.statement, to.statement)
    const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))
    if (overlap < 0.04 && sharedConcepts.length === 0 && !dimension) continue

    addCandidate(map, {
      fromClaimId: from.id,
      toClaimId: to.id,
      type: 'COMPLEMENTARY',
      rationale: 'Shared topic/concepts — candidate for cross-source semantic review.',
      confidence: overlap >= 0.15 ? 'moderate' : 'weak',
      discoveryLevel: 'SEMANTIC_RELATIONSHIP',
      dimension,
      bridgeConcept: dimension ?? sharedConcepts[0],
    })
  }
  return [...map.values()]
}

function addCandidate(
  map: Map<string, RelationshipCandidate>,
  candidate: RelationshipCandidate,
): void {
  const key = pairKey(candidate.fromClaimId, candidate.toClaimId)
  const existing = map.get(key)
  if (!existing || rankLevel(candidate.discoveryLevel) >= rankLevel(existing.discoveryLevel)) {
    map.set(key, candidate)
  }
}

function rankLevel(level: DiscoveryLevel): number {
  if (level === 'DIRECT_MATCH') return 3
  if (level === 'SEMANTIC_RELATIONSHIP') return 2
  return 1
}

export function discoverDirectMatchCandidates(claims: ReasoningClaim[]): RelationshipCandidate[] {
  const map = new Map<string, RelationshipCandidate>()
  for (const [from, to] of crossSourcePairs(claims)) {
    const fromTokens = tokenSet(from.statement)
    const toTokens = tokenSet(to.statement)
    const overlap = overlapRatio(fromTokens, toTokens)
    const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))

    const dimension = extractSharedDimension(from.statement, to.statement)

    if (hasSemanticPredicateCompatibility(from.statement, to.statement)) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'AGREEMENT',
        rationale: 'Semantic predicate compatibility on shared policy or metric proposition.',
        confidence: 'moderate',
        discoveryLevel: 'DIRECT_MATCH',
        dimension: dimension ?? 'performance',
      })
      continue
    }

    if (
      isNullEffectOpposition(from.statement, to.statement) ||
      isOpposingDirectionPair(from.statement, to.statement)
    ) {
      const overlap = overlapRatio(fromTokens, toTokens)
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: overlap >= 0.2 ? 'CONTRADICTION' : 'TENSION',
        rationale: 'Semantic opposition on shared outcome proposition despite low lexical overlap.',
        confidence: 'moderate',
        discoveryLevel: 'DIRECT_MATCH',
        dimension,
      })
      continue
    }

    if (isNumericRangeEquivalent(from.statement, to.statement)) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'AGREEMENT',
        rationale: 'Numeric range equivalence after unit normalization.',
        confidence: 'strong',
        discoveryLevel: 'DIRECT_MATCH',
        dimension: dimension ?? 'performance',
      })
      continue
    }

    if (
      isHazardHealthComplementaryPair(from.statement, to.statement) ||
      isPhenomenonOutcomeComplementaryPair(from.statement, to.statement)
    ) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'COMPLEMENTARY',
        rationale: 'Shared hazard or phenomenon with distinct downstream outcomes.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension,
      })
      continue
    }

    if (overlap < 0.15 && sharedConcepts.length === 0) continue

    const fromPos = POSITIVE_MARKERS.test(from.statement)
    const fromNeg = NEGATIVE_MARKERS.test(from.statement)
    const toPos = POSITIVE_MARKERS.test(to.statement)
    const toNeg = NEGATIVE_MARKERS.test(to.statement)

    if (overlap >= 0.28 || (overlap >= 0.15 && sharedConcepts.length > 0)) {
      let type: ReasoningRelationshipType = 'AGREEMENT'
      let confidence: ConfidenceLevel = overlap >= 0.45 ? 'strong' : 'moderate'

      if ((fromPos && toNeg) || (fromNeg && toPos)) {
        type = overlap >= 0.3 ? 'CONTRADICTION' : 'TENSION'
      } else if (
        isNullEffectOpposition(from.statement, to.statement) ||
        isOpposingDirectionPair(from.statement, to.statement)
      ) {
        type = overlap >= 0.25 ? 'CONTRADICTION' : 'TENSION'
      } else if (overlap >= 0.25 && overlap < 0.45) {
        type = 'PARTIAL_AGREEMENT'
      }

      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type,
        rationale: `Direct semantic overlap (${Math.round(overlap * 100)}%) on shared proposition.`,
        confidence,
        discoveryLevel: 'DIRECT_MATCH',
        dimension,
      })
    }
  }
  return [...map.values()]
}

export function discoverSemanticCandidates(claims: ReasoningClaim[]): RelationshipCandidate[] {
  const map = new Map<string, RelationshipCandidate>()
  for (const [from, to] of crossSourcePairs(claims)) {
    const dimension = extractSharedDimension(from.statement, to.statement)
    const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))

    const fromProblem = PROBLEM_MARKERS.test(from.statement)
    const toProblem = PROBLEM_MARKERS.test(to.statement)
    const fromSolution = SOLUTION_MARKERS.test(from.statement)
    const toSolution = SOLUTION_MARKERS.test(to.statement)
    const fromMechanism = MECHANISM_MARKERS.test(from.statement)
    const toMechanism = MECHANISM_MARKERS.test(to.statement)
    const fromOutcome = OUTCOME_MARKERS.test(from.statement)
    const toOutcome = OUTCOME_MARKERS.test(to.statement)
    const fromPos = POSITIVE_MARKERS.test(from.statement)
    const fromNeg = NEGATIVE_MARKERS.test(from.statement)
    const toPos = POSITIVE_MARKERS.test(to.statement)
    const toNeg = NEGATIVE_MARKERS.test(to.statement)

    if (fromProblem && toSolution) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'PROBLEM_SOLUTION',
        rationale: 'Problem claim paired with solution-oriented claim.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension: dimension ?? 'complexity',
        bridgeConcept: 'problem_solution',
      })
    } else if (toProblem && fromSolution) {
      addCandidate(map, {
        fromClaimId: to.id,
        toClaimId: from.id,
        type: 'PROBLEM_SOLUTION',
        rationale: 'Problem claim paired with solution-oriented claim.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension: dimension ?? 'complexity',
        bridgeConcept: 'problem_solution',
      })
    }

    if (fromMechanism && toOutcome) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'MECHANISM_OUTCOME',
        rationale: 'Mechanism claim paired with outcome claim.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension: dimension ?? 'technical_capability',
        bridgeConcept: 'mechanism_outcome',
      })
    } else if (toMechanism && fromOutcome) {
      addCandidate(map, {
        fromClaimId: to.id,
        toClaimId: from.id,
        type: 'MECHANISM_OUTCOME',
        rationale: 'Mechanism claim paired with outcome claim.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension: dimension ?? 'technical_capability',
        bridgeConcept: 'mechanism_outcome',
      })
    }

    if (
      (fromNeg && toPos && dimension) ||
      (fromPos && toNeg && dimension)
    ) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'TRADE_OFF',
        rationale: 'Opposing evaluations on shared dimension.',
        confidence: 'moderate',
        discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        dimension,
        bridgeConcept: 'trade_off',
      })
    }

    if (
      (sharedConcepts.length > 0 || dimension) &&
      !fromProblem &&
      !toProblem &&
      !fromSolution &&
      !toSolution
    ) {
      const fromTokens = tokenSet(from.statement)
      const toTokens = tokenSet(to.statement)
      const overlap = overlapRatio(fromTokens, toTokens)
      if (overlap >= 0.05 && overlap < 0.28) {
        addCandidate(map, {
          fromClaimId: from.id,
          toClaimId: to.id,
          type: 'COMPLEMENTARY',
          rationale: 'Shared dimension with complementary perspectives.',
          confidence: 'weak',
          discoveryLevel: 'SEMANTIC_RELATIONSHIP',
          dimension,
          bridgeConcept: dimension,
        })
      }
    }
  }
  return [...map.values()]
}

export function discoverInferenceCandidates(claims: ReasoningClaim[]): RelationshipCandidate[] {
  const map = new Map<string, RelationshipCandidate>()
  for (const [from, to] of crossSourcePairs(claims)) {
    const fromAdoption =
      /\b(friction|integration|switch|workflow|resist|adopt)\b/i.test(from.statement)
    const toOrg =
      /\b(organization|team|workflow|change|resist|switching)\b/i.test(to.statement)
    const fromTech =
      /\b(reduces|simplifies|protocol|standard|integration|friction)\b/i.test(from.statement)

    if (fromTech && toOrg) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'ENABLER',
        rationale: 'Technical capability may interact with organizational adoption dynamics.',
        confidence: 'moderate',
        discoveryLevel: 'CROSS_SOURCE_INFERENCE',
        dimension: 'adoption',
        bridgeConcept: 'adoption_friction',
      })
    }

    if (fromAdoption && toOrg) {
      addCandidate(map, {
        fromClaimId: from.id,
        toClaimId: to.id,
        type: 'ADOPTION_BARRIER',
        rationale: 'Cross-source adoption barrier inference candidate.',
        confidence: 'weak',
        discoveryLevel: 'CROSS_SOURCE_INFERENCE',
        dimension: 'organizational_friction',
        bridgeConcept: 'adoption_barrier',
      })
    }
  }
  return [...map.values()]
}

export function mergeCandidates(
  ...groups: RelationshipCandidate[][]
): RelationshipCandidate[] {
  const map = new Map<string, RelationshipCandidate>()
  for (const group of groups) {
    for (const c of group) addCandidate(map, c)
  }
  return [...map.values()]
}

export function discoverHeuristicCandidates(claims: ReasoningClaim[]): {
  direct: RelationshipCandidate[]
  semantic: RelationshipCandidate[]
  inference: RelationshipCandidate[]
  bridge: RelationshipCandidate[]
  all: RelationshipCandidate[]
} {
  const direct = discoverDirectMatchCandidates(claims)
  const semantic = discoverSemanticCandidates(claims)
  const inference = discoverInferenceCandidates(claims)
  const bridge = discoverTopicBridgeCandidates(claims)
  return {
    direct,
    semantic,
    inference,
    bridge,
    all: mergeCandidates(direct, semantic, inference, bridge),
  }
}

export type DiscoveryStats = {
  directCandidates: number
  semanticCandidates: number
  inferenceCandidates: number
  bridgeCandidates?: number
  candidatePairs: number
}

export function countDiscoveryStats(heuristic: ReturnType<typeof discoverHeuristicCandidates>): DiscoveryStats {
  return {
    directCandidates: heuristic.direct.length,
    semanticCandidates: heuristic.semantic.length,
    inferenceCandidates: heuristic.inference.length,
    bridgeCandidates: heuristic.bridge.length,
    candidatePairs: heuristic.all.length,
  }
}
