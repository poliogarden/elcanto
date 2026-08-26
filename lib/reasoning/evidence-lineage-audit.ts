import {
  agreementSourceCount,
  divideSourceCount,
  deriveLandscapeFromEvidence,
} from '@/lib/reasoning/landscape-from-evidence'
import {
  alignJudgmentPropositions,
  buildSourceCountSummary,
  type JudgmentPropositionLineage,
  type SourceCountSummary,
} from '@/lib/reasoning/judgment-lineage'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export function alignReasoningEvidenceDisplay(
  reasoning: MultiSourceReasoning,
): MultiSourceReasoning {
  const significant = reasoning.significantRelationships ?? []
  const landscape = deriveLandscapeFromEvidence({
    significantClusters: significant,
    knowledgeGaps: reasoning.knowledgeGaps,
  })
  const aligned = alignJudgmentPropositions({
    judgment: reasoning.judgment,
    synthesis: reasoning.synthesis,
    significantClusters: significant,
    patterns: reasoning.patterns,
    insights: reasoning.insights,
    knowledgeGaps: reasoning.knowledgeGaps,
    claims: reasoning.claims,
    evidence: reasoning.evidence,
    verifiedRelationships: reasoning.relationships,
  })

  return {
    ...reasoning,
    landscape,
    judgment: aligned.judgment,
    diagnostics: {
      ...reasoning.diagnostics,
      judgmentPropositionLineage: aligned.propositions,
      sourceCountSummary:
        reasoning.diagnostics.sourceCountSummary ??
        buildSourceCountSummary({
          submittedSourceCount: reasoning.diagnostics.pipelineStats?.sourcesCount ?? 0,
          excludedSourceIds: reasoning.excludedSources.map((e) => e.sourceId),
          relevantSourceIds: reasoning.clusters
            .flatMap((c) => c.sourceIds)
            .filter((sid) => !reasoning.excludedSources.some((e) => e.sourceId === sid)),
        }),
    },
  }
}

export type LineageInvariantResult = {
  ok: boolean
  violations: string[]
}

export type EvidenceLineageReport = {
  sourceCounts: SourceCountSummary
  extractedClaims: number
  relevantClaims: number
  verifiedRelationships: number
  relationshipClusters: number
  significantRelationships: number
  agreementClusters: number
  divideClusters: number
  agreementSourceCount: number
  divideSourceCount: number
  gapNodes: number
  emergentInsights: number
  judgmentPropositions: JudgmentPropositionLineage[]
  uiNumberSources: {
    landscapeAgreeCountLabel: string
    landscapeDivideCountLabel: string
    explorerAgreementCount: number
    explorerDivideCount: number
    graphAgreeBranchSummary: string
  }
  invariants: LineageInvariantResult
}

export function verifyLineageInvariants(input: {
  reasoning: MultiSourceReasoning
  sourceCounts: SourceCountSummary
  propositions: JudgmentPropositionLineage[]
}): LineageInvariantResult {
  const violations: string[] = []
  const { reasoning, sourceCounts, propositions } = input
  const significant = reasoning.significantRelationships ?? []
  const agreeSrc = agreementSourceCount(significant)
  const divideSrc = divideSourceCount(significant)
  const derivedLandscape = deriveLandscapeFromEvidence({
    significantClusters: significant,
    knowledgeGaps: reasoning.knowledgeGaps,
  })

  if (reasoning.landscape.agree.countLabel !== derivedLandscape.agree.countLabel) {
    violations.push(
      `landscape.agree.countLabel (${reasoning.landscape.agree.countLabel}) !== evidence-derived (${derivedLandscape.agree.countLabel})`,
    )
  }
  if (reasoning.landscape.divide.countLabel !== derivedLandscape.divide.countLabel) {
    violations.push(
      `landscape.divide.countLabel (${reasoning.landscape.divide.countLabel}) !== evidence-derived (${derivedLandscape.divide.countLabel})`,
    )
  }
  if (divideSrc === 0 && derivedLandscape.divide.cards.length > 0) {
    violations.push('divide cards exist but verified divide source count is 0')
  }
  if (agreeSrc > sourceCounts.relevantSourceCount) {
    violations.push(
      `agreementSourceCount (${agreeSrc}) > relevantSourceCount (${sourceCounts.relevantSourceCount})`,
    )
  }
  if (divideSrc > sourceCounts.relevantSourceCount) {
    violations.push(
      `divideSourceCount (${divideSrc}) > relevantSourceCount (${sourceCounts.relevantSourceCount})`,
    )
  }

  for (const p of propositions) {
    if (p.supportStatus === 'UNSUPPORTED' && p.proposition === reasoning.judgment?.statement) {
      violations.push(`judgment statement is UNSUPPORTED: ${p.proposition.slice(0, 80)}`)
    }
    for (const g of reasoning.knowledgeGaps) {
      const gapWords = g.question.toLowerCase().split(/\W+/).filter((w) => w.length > 4)
      const propWords = p.proposition.toLowerCase().split(/\W+/)
      const hits = gapWords.filter((w) => propWords.includes(w)).length
      if (hits >= 2 && p.clusterIds.length === 0 && p.relationshipIds.length === 0) {
        violations.push(`proposition may leak knowledge gap: ${p.proposition.slice(0, 60)}`)
      }
    }
  }

  if (reasoning.insights.length === 0 && reasoning.judgment?.statement) {
    if (
      /\b(may limit|might limit|could limit)\b/i.test(reasoning.judgment.statement) &&
      divideSrc === 0
    ) {
      violations.push('judgment contains emergent-style inference without emergent insights or divide evidence')
    }
  }

  return { ok: violations.length === 0, violations }
}

export function buildEvidenceLineageReport(
  reasoning: MultiSourceReasoning,
  document: SynthesisDocument,
): EvidenceLineageReport {
  const aligned = alignReasoningEvidenceDisplay(reasoning)
  const submitted = document.voices.length
  const excludedIds = aligned.excludedSources.map((e) => e.sourceId)
  const relevantIds = document.voices
    .map((v) => v.source?.sourceId ?? `source_${v.voice.n}`)
    .filter((sid) => !excludedIds.includes(sid))

  const sourceCounts = {
    submittedSourceCount: submitted,
    analyzedSourceCount: submitted,
    relevantSourceCount: relevantIds.length,
    excludedSourceCount: excludedIds.length,
  }

  const significant = aligned.significantRelationships ?? []
  const agreeClusters = significant.filter((c) => c.visualKind === 'agree')
  const divideClusters = significant.filter(
    (c) => c.visualKind === 'divide' || c.visualKind === 'trade-off',
  )

  const alignedProps = alignJudgmentPropositions({
    judgment: aligned.judgment,
    synthesis: aligned.synthesis,
    significantClusters: significant,
    patterns: aligned.patterns,
    insights: aligned.insights,
    knowledgeGaps: aligned.knowledgeGaps,
    claims: aligned.claims,
    evidence: aligned.evidence,
    verifiedRelationships: aligned.relationships,
  })

  const landscape = deriveLandscapeFromEvidence({
    significantClusters: significant,
    knowledgeGaps: aligned.knowledgeGaps,
  })

  const agreementCount = significant.filter((c) => c.visualKind === 'agree').length
  const divideCount = significant.filter((c) => c.visualKind === 'divide').length
  const agreeSrc = agreementSourceCount(significant)
  const divideSrc = divideSourceCount(significant)

  const invariants = verifyLineageInvariants({
    reasoning: aligned,
    sourceCounts,
    propositions: alignedProps.propositions,
  })

  return {
    sourceCounts,
    extractedClaims: aligned.diagnostics.pipelineStats?.claimsExtracted ?? aligned.claims.length,
    relevantClaims:
      aligned.diagnostics.pipelineStats?.relevantClaims ?? aligned.claims.length,
    verifiedRelationships: aligned.relationships.filter(
      (r) => r.verificationStatus === 'SUPPORTED',
    ).length,
    relationshipClusters: aligned.relationshipClusters?.length ?? 0,
    significantRelationships: significant.length,
    agreementClusters: agreeClusters.length,
    divideClusters: divideClusters.length,
    agreementSourceCount: agreeSrc,
    divideSourceCount: divideSrc,
    gapNodes: aligned.knowledgeGaps.length,
    emergentInsights: aligned.insights.length,
    judgmentPropositions: alignedProps.propositions,
    uiNumberSources: {
      landscapeAgreeCountLabel: landscape.agree.countLabel,
      landscapeDivideCountLabel: landscape.divide.countLabel,
      explorerAgreementCount: agreementCount,
      explorerDivideCount: divideCount,
      graphAgreeBranchSummary:
        agreementCount > 0
          ? `${agreementCount} agreement cluster${agreementCount !== 1 ? 's' : ''} · ${agreeSrc} source${agreeSrc !== 1 ? 's' : ''}`
          : 'No verified cross-source agreements',
    },
    invariants,
  }
}
