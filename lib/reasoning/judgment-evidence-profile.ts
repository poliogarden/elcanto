import type {
  ReasoningClaim,
  ReasoningEvidence,
  ReasoningKnowledgeGap,
  ReasoningRelationship,
  RelationshipCluster,
} from '@/lib/reasoning/types'

export type EvidenceStrengthLevel = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
export type SourceCoverageLevel = 'FULL' | 'PARTIAL' | 'LIMITED'
export type ConfidenceCeiling = 'HIGH' | 'MODERATE' | 'WEAK' | 'LOW'

export type VerifiedPropositionSummary = {
  text: string
  clusterId: string
  supportingSourceIds: string[]
  claimIds: string[]
  evidenceStrength: EvidenceStrengthLevel
  hypeOrInterpretive: boolean
  noDirectEvidence: boolean
}

export type JudgmentEvidenceProfile = {
  totalSources: number
  participatingSources: number
  participationRatio: number
  sourceCoverage: SourceCoverageLevel
  verifiedRelationships: number
  significantClusters: number
  directEvidenceClaims: number
  indirectEvidenceClaims: number
  noEvidenceClaims: number
  evidenceStrength: EvidenceStrengthLevel
  confidenceCeiling: ConfidenceCeiling
  verifiedPropositions: VerifiedPropositionSummary[]
  contradictingRelationships: number
  knowledgeGapCount: number
  supportingSourceIds: string[]
  clusterCountAgree: number
}

function classifyClaimEvidenceStrength(
  claim: ReasoningClaim | undefined,
  evidenceById: Map<string, ReasoningEvidence>,
): EvidenceStrengthLevel {
  if (!claim) return 'NONE'
  if (claim.evidenceStrength === 'STRONG' || claim.evidenceStrength === 'MODERATE') {
    return claim.evidenceStrength
  }
  if (claim.evidenceStrength === 'WEAK') return 'WEAK'
  if (claim.evidenceIds.length === 0) return 'NONE'
  const texts = claim.evidenceIds
    .map((id) => evidenceById.get(id)?.text)
    .filter((t): t is string => Boolean(t))
  if (texts.length === 0) return 'NONE'
  return 'MODERATE'
}

function isHypeOrInterpretiveClaim(claim: ReasoningClaim): boolean {
  return (
    claim.claimQualityClass === 'HYPE' ||
    claim.claimQualityClass === 'INTERPRETIVE' ||
    claim.claimQualityClass === 'PREDICTIVE' ||
    claim.claimType === 'interpretive' ||
    claim.claimType === 'predictive' ||
    /\b(revolution|transform|game[- ]?changer|dominant|inevitable)\b/i.test(claim.statement)
  )
}

function aggregateEvidenceStrength(levels: EvidenceStrengthLevel[]): EvidenceStrengthLevel {
  if (levels.length === 0) return 'NONE'
  if (levels.every((l) => l === 'NONE')) return 'NONE'
  if (levels.some((l) => l === 'STRONG') && levels.filter((l) => l !== 'NONE').every((l) => l !== 'WEAK')) {
    return 'STRONG'
  }
  if (levels.some((l) => l === 'MODERATE' || l === 'STRONG')) return 'MODERATE'
  return 'WEAK'
}

function sourceCoverageFromRatio(ratio: number): SourceCoverageLevel {
  if (ratio >= 0.8) return 'FULL'
  if (ratio >= 0.5) return 'PARTIAL'
  return 'LIMITED'
}

function computeConfidenceCeiling(input: {
  participationRatio: number
  evidenceStrength: EvidenceStrengthLevel
  noEvidenceClaims: number
  directEvidenceClaims: number
  significantClusters: number
  verifiedRelationships: number
}): ConfidenceCeiling {
  if (input.significantClusters === 0 && input.verifiedRelationships === 0) return 'LOW'
  if (
    input.participationRatio >= 0.8 &&
    input.evidenceStrength === 'STRONG' &&
    input.noEvidenceClaims === 0 &&
    input.directEvidenceClaims > 0
  ) {
    return 'HIGH'
  }
  if (
    input.participationRatio >= 0.5 &&
    input.evidenceStrength !== 'NONE' &&
    input.evidenceStrength !== 'WEAK' &&
    input.noEvidenceClaims < input.directEvidenceClaims
  ) {
    return 'MODERATE'
  }
  if (input.verifiedRelationships > 0 || input.significantClusters > 0) return 'WEAK'
  return 'LOW'
}

export function computeJudgmentEvidenceProfile(input: {
  totalSourceCount: number
  significantClusters: RelationshipCluster[]
  verifiedRelationships: ReasoningRelationship[]
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  knowledgeGaps?: ReasoningKnowledgeGap[]
}): JudgmentEvidenceProfile {
  const evidenceById = new Map(input.evidence.map((e) => [e.id, e]))
  const claimById = new Map(input.claims.map((c) => [c.id, c]))

  const supportingSourceIds = [
    ...new Set(input.significantClusters.flatMap((c) => c.supportingSourceIds)),
  ]
  const participatingSources =
    supportingSourceIds.length > 0
      ? supportingSourceIds.length
      : new Set(
          input.verifiedRelationships.flatMap((r) => [r.fromSourceId, r.toSourceId]),
        ).size

  const totalSources = Math.max(1, input.totalSourceCount)
  const participationRatio = Math.min(1, participatingSources / totalSources)

  const clusterClaimIds = [
    ...new Set(input.significantClusters.flatMap((c) => c.supportingClaimIds)),
  ]
  const clusterClaims = clusterClaimIds.map((id) => claimById.get(id)).filter(Boolean) as ReasoningClaim[]

  let directEvidenceClaims = 0
  let indirectEvidenceClaims = 0
  let noEvidenceClaims = 0

  for (const claim of clusterClaims) {
    const strength = classifyClaimEvidenceStrength(claim, evidenceById)
    if (strength === 'STRONG' || strength === 'MODERATE') directEvidenceClaims++
    else if (strength === 'WEAK') indirectEvidenceClaims++
    else noEvidenceClaims++
  }

  const verifiedPropositions: VerifiedPropositionSummary[] = input.significantClusters.map(
    (cluster) => {
      const claimsInCluster = cluster.supportingClaimIds
        .map((id) => claimById.get(id))
        .filter(Boolean) as ReasoningClaim[]
      const strengths = claimsInCluster.map((c) => classifyClaimEvidenceStrength(c, evidenceById))
      const clusterEvidenceStrength = aggregateEvidenceStrength(strengths)
      const hypeOrInterpretive = claimsInCluster.some(isHypeOrInterpretiveClaim)
      const noDirectEvidence =
        clusterEvidenceStrength === 'NONE' ||
        clusterEvidenceStrength === 'WEAK' ||
        claimsInCluster.every((c) => c.evidenceIds.length === 0)

      return {
        text: cluster.canonicalClaim,
        clusterId: cluster.id,
        supportingSourceIds: cluster.supportingSourceIds,
        claimIds: cluster.supportingClaimIds,
        evidenceStrength: clusterEvidenceStrength,
        hypeOrInterpretive,
        noDirectEvidence,
      }
    },
  )

  const clusterStrengthLevels = verifiedPropositions.map((p) => p.evidenceStrength)
  const evidenceStrength = aggregateEvidenceStrength(clusterStrengthLevels)

  const contradictingRelationships = input.verifiedRelationships.filter(
    (r) =>
      r.type === 'CONTRADICTION' ||
      r.type === 'TENSION' ||
      r.type === 'TRADE_OFF',
  ).length

  const clusterCountAgree = input.significantClusters.filter(
    (c) => c.visualKind === 'agree',
  ).length

  const confidenceCeiling = computeConfidenceCeiling({
    participationRatio,
    evidenceStrength,
    noEvidenceClaims,
    directEvidenceClaims,
    significantClusters: input.significantClusters.length,
    verifiedRelationships: input.verifiedRelationships.length,
  })

  return {
    totalSources,
    participatingSources,
    participationRatio,
    sourceCoverage: sourceCoverageFromRatio(participationRatio),
    verifiedRelationships: input.verifiedRelationships.length,
    significantClusters: input.significantClusters.length,
    directEvidenceClaims,
    indirectEvidenceClaims,
    noEvidenceClaims,
    evidenceStrength,
    confidenceCeiling,
    verifiedPropositions,
    contradictingRelationships,
    knowledgeGapCount: input.knowledgeGaps?.length ?? 0,
    supportingSourceIds,
    clusterCountAgree,
  }
}

export function formatJudgmentEvidenceProfileForPrompt(profile: JudgmentEvidenceProfile): string {
  const propositions = profile.verifiedPropositions
    .map(
      (p) =>
        `- [${p.clusterId}] "${p.text}"\n  sources: ${p.supportingSourceIds.join(', ')}\n  evidence: ${p.evidenceStrength}${p.hypeOrInterpretive ? ' · interpretive/hype source framing' : ''}${p.noDirectEvidence ? ' · weak/no direct evidence' : ''}`,
    )
    .join('\n')

  return [
    `TOTAL_ANALYZED_SOURCES: ${profile.totalSources}`,
    `SUPPORTING_SOURCES: ${profile.participatingSources} (${profile.sourceCoverage} coverage, ratio ${profile.participationRatio.toFixed(2)})`,
    `VERIFIED_RELATIONSHIPS: ${profile.verifiedRelationships}`,
    `SIGNIFICANT_CLUSTERS: ${profile.significantClusters} (${profile.clusterCountAgree} agreement-type)`,
    `CLAIM_EVIDENCE: direct=${profile.directEvidenceClaims} indirect=${profile.indirectEvidenceClaims} no_evidence=${profile.noEvidenceClaims}`,
    `EVIDENCE_STRENGTH: ${profile.evidenceStrength}`,
    `CONFIDENCE_CEILING: ${profile.confidenceCeiling}`,
    `CONTRADICTING_RELATIONSHIPS: ${profile.contradictingRelationships}`,
    `KNOWLEDGE_GAPS: ${profile.knowledgeGapCount}`,
    '',
    'VERIFIED_PROPOSITIONS:',
    propositions || '(none)',
  ].join('\n')
}

export function formatSourceCoverageNote(profile: JudgmentEvidenceProfile): string {
  if (profile.participatingSources >= profile.totalSources) {
    return `Supported by ${profile.participatingSources} of ${profile.totalSources} sources`
  }
  return `Supported by ${profile.participatingSources} of ${profile.totalSources} sources`
}

export function formatEvidenceStrengthLabel(profile: JudgmentEvidenceProfile): string {
  if (profile.evidenceStrength === 'STRONG') return 'Strong evidence'
  if (profile.evidenceStrength === 'MODERATE') return 'Moderate evidence'
  if (profile.evidenceStrength === 'WEAK') return 'Weak evidence'
  return 'Weak evidence'
}
