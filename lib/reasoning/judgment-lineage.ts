import type {
  ReasoningClaim,
  ReasoningEvidence,
  ReasoningInsight,
  ReasoningJudgment,
  ReasoningKnowledgeGap,
  ReasoningPattern,
  ReasoningRelationship,
  ReasoningSynthesisBlock,
  RelationshipCluster,
} from '@/lib/reasoning/types'

export type PropositionSupportStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED'

export type JudgmentPropositionLineage = {
  proposition: string
  supportStatus: PropositionSupportStatus
  clusterIds: string[]
  relationshipIds: string[]
  claimIds: string[]
  sourceIds: string[]
  evidenceIds: string[]
}

export type SourceCountSummary = {
  submittedSourceCount: number
  analyzedSourceCount: number
  relevantSourceCount: number
  excludedSourceCount: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
}

function overlapRatio(a: string, b: string): number {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

function gapTerms(gaps: ReasoningKnowledgeGap[]): Set<string> {
  const terms = new Set<string>()
  for (const g of gaps) {
    for (const w of tokenize(g.question)) terms.add(w)
    for (const w of tokenize(g.whyItMatters)) terms.add(w)
    for (const w of tokenize(g.linkedJudgmentAspect)) terms.add(w)
  }
  return terms
}

function overlapsGapTerms(text: string, gapTermsSet: Set<string>): boolean {
  const words = tokenize(text)
  let hits = 0
  for (const w of words) {
    if (gapTermsSet.has(w)) hits++
  }
  return hits >= 2
}

function isEmergentInferencePhrase(text: string): boolean {
  return /\b(may limit|might limit|could limit|may reduce|might reduce|could reduce|implies that|suggests that|therefore|in turn)\b/i.test(
    text,
  )
}

const JUDGMENT_HALLUCINATION_PATTERNS: RegExp[] = [
  /\b(market penetration|penetrate the market|penetrates the market)\b/i,
  /\b(dominat(e|es|ing)|market dominance|industry dominance)\b/i,
  /\b(outperform(s|ing)?\s+traditional|superior to traditional|better than traditional api)\b/i,
  /\b(industry adoption|market adoption|widespread adoption|mass adoption)\b/i,
  /\b(user-?friendly experience compared to traditional)\b/i,
  /\b(hot topic|redefines the landscape|revolutioniz)\b/i,
]

function hasUnsupportedJudgmentClaim(text: string): boolean {
  return JUDGMENT_HALLUCINATION_PATTERNS.some((re) => re.test(text))
}

function clustersForText(
  text: string,
  clusters: RelationshipCluster[],
  minOverlap = 0.18,
): RelationshipCluster[] {
  return clusters.filter((c) => overlapRatio(text, c.canonicalClaim) >= minOverlap)
}

function lineageFromClusters(
  clusters: RelationshipCluster[],
  claims: ReasoningClaim[],
  evidence: ReasoningEvidence[],
): Pick<
  JudgmentPropositionLineage,
  'clusterIds' | 'relationshipIds' | 'claimIds' | 'sourceIds' | 'evidenceIds'
> {
  const clusterIds = clusters.map((c) => c.id)
  const relationshipIds = [...new Set(clusters.flatMap((c) => c.memberRelationshipIds))]
  const claimIds = [...new Set(clusters.flatMap((c) => c.supportingClaimIds))]
  const sourceIds = [...new Set(clusters.flatMap((c) => c.supportingSourceIds))]
  const evidenceIds = claimIds.flatMap(
    (cid) => claims.find((c) => c.id === cid)?.evidenceIds ?? [],
  )
  const resolvedEvidence = evidenceIds.filter((eid) => evidence.some((e) => e.id === eid))
  return {
    clusterIds,
    relationshipIds,
    claimIds,
    sourceIds,
    evidenceIds: resolvedEvidence,
  }
}

import { isPatternEvidenceBacked } from '@/lib/reasoning/evidence-integrity'
import { divideSourceCount } from '@/lib/reasoning/landscape-from-evidence'

function stripUnverifiedInferenceClauses(
  statement: string,
  input: {
    insights: ReasoningInsight[]
    significantClusters: RelationshipCluster[]
  },
): string {
  const divideSrc = divideSourceCount(input.significantClusters)
  if (input.insights.length > 0 || divideSrc > 0) return statement
  if (!isEmergentInferencePhrase(statement)) return statement

  const parts = statement.split(/\s*,?\s+but\s+/i)
  if (parts.length > 1) {
    const head = parts[0].trim()
    return head.endsWith('.') ? head : `${head}.`
  }
  return statement
}

function assessProposition(
  text: string,
  input: {
    significantClusters: RelationshipCluster[]
    patterns: ReasoningPattern[]
    insights: ReasoningInsight[]
    knowledgeGaps: ReasoningKnowledgeGap[]
    claims: ReasoningClaim[]
    evidence: ReasoningEvidence[]
    verifiedRelationships: ReasoningRelationship[]
  },
): JudgmentPropositionLineage {
  const trimmed = text.trim()
  const gapTermsSet = gapTerms(input.knowledgeGaps)

  if (!trimmed) {
    return {
      proposition: trimmed,
      supportStatus: 'UNSUPPORTED',
      clusterIds: [],
      relationshipIds: [],
      claimIds: [],
      sourceIds: [],
      evidenceIds: [],
    }
  }

  if (overlapsGapTerms(trimmed, gapTermsSet)) {
    return {
      proposition: trimmed,
      supportStatus: 'UNSUPPORTED',
      clusterIds: [],
      relationshipIds: [],
      claimIds: [],
      sourceIds: [],
      evidenceIds: [],
    }
  }

  if (hasUnsupportedJudgmentClaim(trimmed)) {
    return {
      proposition: trimmed,
      supportStatus: 'UNSUPPORTED',
      clusterIds: [],
      relationshipIds: [],
      claimIds: [],
      sourceIds: [],
      evidenceIds: [],
    }
  }

  const matchedClusters = clustersForText(trimmed, input.significantClusters)
  const evidenceBackedPatterns = input.patterns.filter((p) =>
    isPatternEvidenceBacked(p, input.significantClusters, input.verifiedRelationships),
  )
  const matchedPatterns = evidenceBackedPatterns.filter(
    (p) => overlapRatio(trimmed, `${p.title} ${p.description}`) >= 0.2,
  )
  const insightBacked = input.insights.some(
    (i) => overlapRatio(trimmed, `${i.statement} ${i.explanation}`) >= 0.25,
  )

  if (matchedClusters.length > 0) {
    const lineage = lineageFromClusters(matchedClusters, input.claims, input.evidence)
    return {
      proposition: trimmed,
      supportStatus: 'SUPPORTED',
      ...lineage,
    }
  }

  if (matchedPatterns.length > 0) {
    const claimIds = [...new Set(matchedPatterns.flatMap((p) => p.claimIds))]
    const sourceIds = [...new Set(matchedPatterns.flatMap((p) => p.sourceIds))]
    const evidenceIds = claimIds.flatMap(
      (cid) => input.claims.find((c) => c.id === cid)?.evidenceIds ?? [],
    )
    return {
      proposition: trimmed,
      supportStatus: 'SUPPORTED',
      clusterIds: [],
      relationshipIds: [...new Set(matchedPatterns.flatMap((p) => p.relationshipIds))],
      claimIds,
      sourceIds,
      evidenceIds,
    }
  }

  if (insightBacked) {
    const insight = input.insights.find(
      (i) => overlapRatio(trimmed, `${i.statement} ${i.explanation}`) >= 0.25,
    )
    return {
      proposition: trimmed,
      supportStatus: 'SUPPORTED',
      clusterIds: [],
      relationshipIds: insight?.relationshipIds ?? [],
      claimIds: insight?.claimIds ?? [],
      sourceIds: insight?.sourceIds ?? [],
      evidenceIds: [],
    }
  }

  if (isEmergentInferencePhrase(trimmed) && input.insights.length === 0) {
    return {
      proposition: trimmed,
      supportStatus: 'UNSUPPORTED',
      clusterIds: [],
      relationshipIds: [],
      claimIds: [],
      sourceIds: [],
      evidenceIds: [],
    }
  }

  const hasAnyEvidence =
    input.significantClusters.length > 0 ||
    evidenceBackedPatterns.length > 0 ||
    input.insights.length > 0
  return {
    proposition: trimmed,
    supportStatus: hasAnyEvidence ? 'PARTIALLY_SUPPORTED' : 'UNSUPPORTED',
    clusterIds: [],
    relationshipIds: [],
    claimIds: [],
    sourceIds: [],
    evidenceIds: [],
  }
}

export function alignJudgmentPropositions(input: {
  judgment: ReasoningJudgment | null
  synthesis: ReasoningSynthesisBlock | null
  significantClusters: RelationshipCluster[]
  patterns: ReasoningPattern[]
  insights: ReasoningInsight[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  verifiedRelationships?: ReasoningRelationship[]
}): {
  judgment: ReasoningJudgment | null
  propositions: JudgmentPropositionLineage[]
} {
  if (!input.judgment) return { judgment: null, propositions: [] }

  const fields = [
    input.judgment.statement,
    input.judgment.whatIsSupported,
    input.judgment.keyReason,
    input.judgment.whatIsUncertain,
  ].filter(Boolean)

  const assessInput = {
    significantClusters: input.significantClusters,
    patterns: input.patterns,
    insights: input.insights,
    knowledgeGaps: input.knowledgeGaps,
    claims: input.claims,
    evidence: input.evidence,
    verifiedRelationships: input.verifiedRelationships ?? [],
  }

  const propositions = fields.map((text) => assessProposition(text, assessInput))

  const statementProp = propositions[0]
  let statement = input.judgment.statement

  if (statementProp?.supportStatus === 'UNSUPPORTED') {
    if (
      input.synthesis?.statement &&
      assessProposition(input.synthesis.statement, assessInput).supportStatus !== 'UNSUPPORTED'
    ) {
      statement = input.synthesis.statement
    } else if (input.significantClusters.length > 0) {
      statement = input.significantClusters[0].canonicalClaim
    } else {
      return { judgment: null, propositions }
    }
  } else if (statementProp?.supportStatus === 'PARTIALLY_SUPPORTED') {
    statement = statement.replace(/\b(will|must|definitely|clearly proves)\b/gi, 'may')
  }

  statement = stripUnverifiedInferenceClauses(statement, {
    insights: input.insights,
    significantClusters: input.significantClusters,
  })

  const whatIsSupported =
    propositions[1]?.supportStatus === 'UNSUPPORTED' ? '' : input.judgment.whatIsSupported
  const keyReason =
    propositions[2]?.supportStatus === 'UNSUPPORTED' ? '' : input.judgment.keyReason
  const whatIsUncertain =
    propositions[3]?.supportStatus === 'UNSUPPORTED' ? '' : input.judgment.whatIsUncertain

  const filteredMissing = input.judgment.missingEvidence.filter(
    (m) => assessProposition(m, assessInput).supportStatus !== 'UNSUPPORTED',
  )

  const supportedPropositions = propositions.filter((p) => p.supportStatus === 'SUPPORTED')
  const reasoningSteps = supportedPropositions.map((p) => ({
    statement: p.proposition,
    clusterIds: p.clusterIds,
    claimIds: p.claimIds,
    sourceIds: p.sourceIds,
  }))

  const limitations = [
    ...input.knowledgeGaps.map((g) => g.question),
    ...propositions
      .filter((p) => p.supportStatus === 'UNSUPPORTED')
      .map((p) => `Unsupported: ${p.proposition.slice(0, 120)}`),
  ].slice(0, 6)

  return {
    judgment: {
      ...input.judgment,
      statement,
      whatIsSupported,
      keyReason,
      whatIsUncertain,
      missingEvidence: filteredMissing,
      reasoningSteps,
      limitations,
    },
    propositions,
  }
}

export function buildSourceCountSummary(input: {
  submittedSourceCount: number
  excludedSourceIds: string[]
  relevantSourceIds: string[]
}): SourceCountSummary {
  return {
    submittedSourceCount: input.submittedSourceCount,
    analyzedSourceCount: input.relevantSourceIds.length + input.excludedSourceIds.length,
    relevantSourceCount: input.relevantSourceIds.length,
    excludedSourceCount: input.excludedSourceIds.length,
  }
}
