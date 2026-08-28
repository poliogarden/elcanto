import { buildAnalysisResult } from '@/lib/reasoning/analysis-result'
import { alignReasoningEvidenceDisplay } from '@/lib/reasoning/evidence-lineage-audit'
import { buildSourceCountSummary } from '@/lib/reasoning/judgment-lineage'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type {
  DisagreementItem,
  SurvivalAnalysis,
  SurvivalClaim,
  SurvivalRelationship,
} from '@/lib/survival/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function mapRelationshipType(
  type: SurvivalRelationship['type'] | string,
): SurvivalRelationship['type'] {
  const map: Record<string, SurvivalRelationship['type']> = {
    AGREEMENT: 'AGREEMENT',
    CONTRADICTION: 'CONTRADICTION',
    TENSION: 'DISAGREEMENT',
    COMPLEMENTARY: 'COMPLEMENTARY',
    CAUSE_EFFECT: 'COMPLEMENTARY',
    DEPENDENCY: 'COMPLEMENTARY',
    PROBLEM_SOLUTION: 'COMPLEMENTARY',
    MECHANISM_OUTCOME: 'COMPLEMENTARY',
    TRADE_OFF: 'DISAGREEMENT',
    PREREQUISITE: 'COMPLEMENTARY',
    CONSTRAINT: 'DISAGREEMENT',
    ADOPTION_BARRIER: 'DISAGREEMENT',
    ENABLER: 'COMPLEMENTARY',
    EXAMPLE_OF: 'PARTIAL_AGREEMENT',
    GENERALIZATION: 'PARTIAL_AGREEMENT',
    SPECIALIZATION: 'PARTIAL_AGREEMENT',
    TEMPORAL_PROGRESSION: 'COMPLEMENTARY',
    SAME_TOPIC_DIFFERENT_PERSPECTIVE: 'PARTIAL_AGREEMENT',
    PARTIAL_AGREEMENT: 'PARTIAL_AGREEMENT',
    INDEPENDENT: 'INDEPENDENT',
  }
  return map[type] ?? 'PARTIAL_AGREEMENT'
}

function claimToSurvival(
  c: MultiSourceReasoning['claims'][number],
  evidenceText: string,
  timestamp: number | null,
): SurvivalClaim {
  return {
    claimId: c.id,
    videoId: c.videoId,
    sourceId: c.sourceId,
    voiceIndex: c.voiceIndex,
    claim: c.statement,
    evidence: evidenceText,
    timestamp,
    confidence: c.confidence,
  }
}

function relToSurvival(r: MultiSourceReasoning['relationships'][number]): SurvivalRelationship {
  return {
    id: r.id,
    fromClaimId: r.fromClaimId,
    toClaimId: r.toClaimId,
    fromVideoId: r.fromVideoId,
    toVideoId: r.toVideoId,
    type: mapRelationshipType(r.type),
    explanation: r.explanation,
    confidence: r.confidence,
  }
}

export function reasoningToSurvival(
  reasoning: MultiSourceReasoning,
  document: SynthesisDocument,
): SurvivalAnalysis {
  const aligned = alignReasoningEvidenceDisplay(reasoning)
  const analysis = buildAnalysisResult(aligned, document)
  const voiceBySource = new Map(
    document.voices.map((v) => [v.source?.sourceId ?? `source_${v.voice.n}`, v]),
  )

  const evidenceById = new Map(aligned.evidence.map((e) => [e.id, e]))

  const claims: SurvivalClaim[] = analysis.displayedClaims.map((c) => {
    const span = c.evidenceSpans?.[0]
    const fromIds =
      c.evidenceIds
        .map((eid) => evidenceById.get(eid)?.text)
        .filter(Boolean)
        .join(' · ') || ''
    const evidenceText =
      span?.originalText ??
      (fromIds || c.evidenceText || 'No direct source evidence')
    const timestamp =
      span?.startTime ??
      c.timestampStart ??
      c.evidenceIds
        .map((eid) => evidenceById.get(eid)?.timestampStart)
        .find((t) => t != null) ??
      null
    return claimToSurvival(c, evidenceText, timestamp)
  })

  const verifiedRelationships: SurvivalRelationship[] = analysis.verifiedRelationships.map(
    relToSurvival,
  )

  const rejectedRelationships = aligned.rejectedRelationships.map((r) => ({
    fromClaimId: r.fromClaimId,
    toClaimId: r.toClaimId,
    proposedType: mapRelationshipType(r.type),
    reason: r.rejectionReason ?? r.explanation,
  }))

  const consensus = aligned.patterns
    .filter((p) => p.type !== 'polarization' && p.type !== 'trade_off')
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      oneLineSummary: p.description.slice(0, 160),
      supportingVideoIds: p.sourceIds.map(
        (sid) => document.voices.find((v) => v.source?.sourceId === sid)?.voice.youtubeId ?? sid,
      ),
      confidence: p.confidence,
    }))

  const disagreements: DisagreementItem[] = analysis.verifiedRelationships
    .filter((r) => r.type === 'CONTRADICTION' || r.type === 'TENSION')
    .slice(0, 3)
    .map((r, i): DisagreementItem | null => {
      const claimA = claims.find((c) => c.claimId === r.fromClaimId)
      const claimB = claims.find((c) => c.claimId === r.toClaimId)
      if (!claimA || !claimB) return null
      return {
        id: `divide_${i + 1}`,
        title: r.type === 'TENSION' ? 'Trade-off' : 'Contradiction',
        oneLineSummary: r.explanation.slice(0, 120),
        sideA: {
          label: `Video ${claimA.voiceIndex}`,
          claimText: claimA.claim,
          claimId: claimA.claimId,
          sourceIds: [claimA.sourceId],
          videoIds: [claimA.videoId],
        },
        sideB: {
          label: `Video ${claimB.voiceIndex}`,
          claimText: claimB.claim,
          claimId: claimB.claimId,
          sourceIds: [claimB.sourceId],
          videoIds: [claimB.videoId],
        },
        confidence: r.confidence,
      }
    })
    .filter((d): d is DisagreementItem => d !== null)

  const sources = document.voices.map((entry) => {
    const sourceId = entry.source?.sourceId ?? `source_${entry.voice.n}`
    const excluded = aligned.excludedSources.find((e) => e.sourceId === sourceId)
    const cluster = aligned.clusters.find((c) => c.sourceIds.includes(sourceId))
    return {
      videoId: entry.voice.youtubeId,
      sourceId,
      voiceIndex: entry.voice.n,
      title: entry.voice.title,
      channel: entry.voice.channel,
      thumbnail: entry.voice.thumbnail,
      position:
        cluster?.label ??
        (excluded ? 'Excluded — off-topic' : entry.analysis?.thesis?.slice(0, 80) ?? entry.voice.title),
      includedInSynthesis: !excluded,
      relevance: excluded ? ('off_topic' as const) : ('on_topic' as const),
    }
  })

  const judgment = aligned.judgment
  const sourceCountSummary =
    aligned.diagnostics.sourceCountSummary ??
    buildSourceCountSummary({
      submittedSourceCount: document.voices.length,
      excludedSourceIds: aligned.excludedSources.map((e) => e.sourceId),
      relevantSourceIds: analysis.sources.synthesized.map((s) => s.sourceId),
    })

  return {
    version: aligned.version,
    topicCoherence: {
      centralQuestion: aligned.centralQuestion,
      coherenceLevel:
        aligned.excludedSources.length > 0
          ? aligned.excludedSources.length >= aligned.clusters.length
            ? 'low'
            : 'moderate'
          : 'high',
      assessments: sources.map((s) => ({
        sourceId: s.sourceId,
        videoId: s.videoId,
        voiceIndex: s.voiceIndex,
        relevance: s.includedInSynthesis ? 'on_topic' : 'off_topic',
        reason: aligned.excludedSources.find((e) => e.sourceId === s.sourceId)?.reason ?? '',
      })),
    },
    excludedSources: aligned.excludedSources.map((e) => ({
      sourceId: e.sourceId,
      videoId: e.videoId,
      voiceIndex: e.voiceIndex,
      title: e.title,
      thumbnail: voiceBySource.get(e.sourceId)?.voice.thumbnail,
      reason: e.reason,
    })),
    submittedVideoCount: analysis.counts.inputSources,
    analyzedVideoCount: analysis.counts.synthesizedSources,
    excludedVideoCount: analysis.counts.excludedSources,
    sources,
    claims,
    verifiedRelationships,
    rejectedRelationships,
    consensus,
    disagreements,
    uncertainClaims: [],
    synthesis: {
      headline: judgment?.statement ?? 'No defensible cross-source judgment.',
      explanation:
        aligned.synthesis?.explanation ??
        judgment?.keyReason ??
        'Insufficient verified relationships for synthesis.',
      confidence:
        judgment?.confidence === 'high'
          ? 'strong'
          : judgment?.confidence === 'moderate'
            ? 'moderate'
            : 'weak',
      judgmentBasis: judgment?.whatIsSupported,
      sourceCoverageNote: judgment?.sourceCoverageNote ?? judgment?.coverageSummary,
    },
    emergentInsights: aligned.insights.map((insight) => ({
      id: insight.id,
      statement: insight.statement,
      reasoningPath: insight.evidencePath.map((step) => ({
        step: step.step === 'pattern' || step.step === 'inference' ? 'relationship' : step.step,
        refId: step.refId,
        label: step.label,
      })),
      confidence:
        insight.confidence === 'high'
          ? 'strong'
          : insight.confidence === 'moderate'
            ? 'moderate'
            : 'weak',
    })),
    emergentInsightMissing: aligned.insights.length === 0,
    knowledgeGaps: aligned.knowledgeGaps.map((g) => ({
      id: g.id,
      question: g.question,
    })),
    landscape: aligned.landscape,
    createdAt: aligned.createdAt,
  }
}

export function getBoardSurvival(document: SynthesisDocument): SurvivalAnalysis | null {
  if (document.reasoning?.mode === 'multi') {
    return reasoningToSurvival(document.reasoning, document)
  }
  return document.survival ?? null
}

export function getAnalysisResult(document: SynthesisDocument) {
  if (document.reasoning?.mode !== 'multi') return null
  const aligned = alignReasoningEvidenceDisplay(document.reasoning)
  return buildAnalysisResult(aligned, document)
}
