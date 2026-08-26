import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import type { SourceAnalysis } from '@/lib/types/source'
import type { StructuredClaim } from '@/lib/types/relationship'
import {
  RelationshipCandidatesSchema,
  RelationshipVerificationSchema,
  EmergentInsightsOnlySchema,
  SurvivalClaimsSchema,
  SurvivalSynthesisSchema,
  TopicCoherenceSchema,
} from '@/lib/survival/schemas'
import { isAbstractDisagreementLabel } from '@/lib/survival/coherence'
import {
  deriveConsensusFromRelationships,
  filterEmergentInsights,
  filterVerifiedRelationships,
} from '@/lib/survival/quality'
import type {
  ConfidenceLevel,
  DisagreementItem,
  EmergentInsight,
  ExcludedSource,
  RejectedRelationship,
  SurvivalAnalysis,
  SurvivalClaim,
  SurvivalRelationship,
  TopicCoherence,
} from '@/lib/survival/types'

const MIN_RELATIONSHIP_CONFIDENCE: ConfidenceLevel = 'moderate'

const CLAIM_SYSTEM = `You extract precise, verifiable claims from video analyses for cross-video comparison.

Rules:
- Each claim must be a complete assertion (subject + predicate), NOT a topic label.
- BAD: "MCP", "AI ecosystem"
- GOOD: "MCP reduces integration complexity between AI tools."
- Keep 5-10 highest-signal claims per video. Drop vague or duplicate claims.
- evidence must quote or closely paraphrase transcript support.
- timestamp in seconds if known from evidence, else null.
- confidence: strong | moderate | weak based on evidence quality.
- Do NOT invent claims not supported by the input.`

const CANDIDATE_SYSTEM = `You find cross-video claim relationships for a survival analysis.

Rules:
- Only propose relationships between claims from DIFFERENT videos.
- Types: AGREEMENT, PARTIAL_AGREEMENT, COMPLEMENTARY, DISAGREEMENT, CONTRADICTION, INDEPENDENT
- INDEPENDENT means they address different questions — do not force a link.
- Most claim pairs have NO relationship. Return only pairs with a real argumentative connection.
- Do NOT connect claims merely because they share keywords.
- Maximum 25 candidates total.
- Prefer precision over coverage.`

const VERIFY_SYSTEM = `You verify proposed cross-video claim relationships.

Reject if:
- Claims address different questions (false agreement/disagreement)
- Relationship is inferred from keyword overlap only
- One claim's meaning was reversed or exaggerated
- Confidence would be weak

Keep only relationships you would defend to a skeptical reader.
Return rejected pairs with a clear reason.`

const COHERENCE_SYSTEM = `You assess whether multiple YouTube videos address the SAME central question for cross-video synthesis.

Rules:
- Infer the central question the selection is trying to explore (e.g. "What is MCP and should developers adopt it?")
- For each source, rate relevance:
  - on_topic: directly addresses the central question
  - partial: related domain but answers a different sub-question
  - off_topic: different subject entirely (e.g. unrelated product, motivational shorts, different technology)
- Be strict: a video that merely mentions AI is NOT on-topic for an MCP-specific question.
- coherenceLevel: high (most on_topic), moderate (mix), low (many off_topic or fragmented)
- Do NOT force all videos into one narrative.`

const SYNTHESIS_SYSTEM = `You synthesize verified cross-video analysis for a visual board.

JUDGMENT HEADLINE (critical):
- The headline must be a JUDGMENT a thoughtful viewer would reach — not a news title.
- BAD: "MCP's Rapid Rise Redefines AI Landscape"
- BAD: "Videos Discuss MCP Impact"
- GOOD: "MCP likely wins on developer integration, but security and enterprise readiness remain unproven."
- GOOD: "Because 3 sources agree MCP reduces glue code while 1 warns about lock-in, adopt for tooling first — not production infra."
- headline must reference a specific tension, tradeoff, or qualified conclusion.
- judgmentBasis: 1 sentence explaining which sources drive the judgment (e.g. "Videos 1–3 agree on X; Video 4 raises Y.")

DISAGREEMENTS (claim-level, critical):
- Each disagreement must cite TWO ACTUAL CLAIMS — not abstract framing.
- BAD side labels: "Focus on Impact", "Focus on Discussions", "Optimistic view"
- GOOD sideA.claimText: "MCP reduces integration complexity between AI tools."
- GOOD sideB.claimText: "MCP adoption is premature until security standards mature."
- title = the shared question they disagree on (e.g. "Is MCP ready for production?")
- claimId must reference an existing claim when possible.

Other rules:
- consensus: max 3, only from VERIFIED relationships showing multi-video agreement on the SAME question
- Only use INCLUDED sources for synthesis. Excluded off-topic videos must NOT appear in consensus/disagreements/synthesis.
- uncertainClaims: flag weak/contested claims
- emergentInsights: max 2, only if NOT in any single video. Set noEmergentInsight=true if none.
- knowledgeGaps: max 3
- sourcePositions: 1 short phrase per INCLUDED source only
- landscape divide cards must name the specific claims in conflict, not abstract themes
- Be conservative. Empty sections are better than fabricated insight.`

function formatClaimsForPrompt(claims: SurvivalClaim[]): string {
  return claims
    .map(
      (c) =>
        `[${c.claimId}] video=${c.videoId} source=${c.sourceId}\n  claim: ${c.claim}\n  evidence: ${c.evidence.slice(0, 280)}`,
    )
    .join('\n\n')
}

function formatVerifiedForPrompt(rels: SurvivalRelationship[]): string {
  return rels
    .map(
      (r) =>
        `[${r.id}] ${r.type}: ${r.fromClaimId} ↔ ${r.toClaimId}\n  ${r.explanation}`,
    )
    .join('\n\n')
}

export async function checkTopicCoherence(sources: SourceAnalysis[]): Promise<TopicCoherence> {
  const openai = getOpenAIClient()
  const payload = sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    thesis: s.thesis,
    centralQuestion: s.centralQuestion,
    topics: s.topics.slice(0, 8),
    summary: s.summary?.slice(0, 400),
  }))

  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'SURVIVAL_COHERENCE',
    system: COHERENCE_SYSTEM,
    user: `Assess topic coherence:\n\n${JSON.stringify(payload, null, 2)}`,
    schema: TopicCoherenceSchema,
    schemaName: 'survival_topic_coherence',
    maxOutputTokens: 4000,
  })

  const sourceById = new Map(sources.map((s) => [s.sourceId, s]))
  return {
    centralQuestion: parsed.centralQuestion,
    coherenceLevel: parsed.coherenceLevel,
    assessments: parsed.assessments.map((a) => {
      const src = sourceById.get(a.sourceId)
      return {
        sourceId: a.sourceId,
        videoId: src?.videoId ?? '',
        voiceIndex: src?.voiceIndex ?? 0,
        relevance: a.relevance,
        reason: a.reason,
      }
    }),
  }
}

export async function refineClaimsFromAnalyses(
  sources: SourceAnalysis[],
): Promise<SurvivalClaim[]> {
  const openai = getOpenAIClient()
  const payload = sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    thesis: s.thesis,
    claims: s.claims.slice(0, 15).map((c: StructuredClaim) => ({
      id: c.id,
      statement: c.statement,
      topic: c.topic,
      confidence: c.confidence,
      evidenceSummary: c.evidenceSummary,
    })),
    evidence: s.evidence.slice(0, 12).map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      text: e.text.slice(0, 200),
    })),
  }))

  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'SURVIVAL_CLAIMS',
    system: CLAIM_SYSTEM,
    user: `Extract survival claims from these per-video analyses:\n\n${JSON.stringify(payload, null, 2)}`,
    schema: SurvivalClaimsSchema,
    schemaName: 'survival_claims',
    contextObjectSize: JSON.stringify(payload).length,
    maxOutputTokens: 8000,
  })

  const bySource = new Map(sources.map((s) => [s.sourceId, s]))
  return parsed.claims.map((c) => {
    const src = bySource.get(c.sourceId)
    return {
      claimId: c.claimId,
      videoId: src?.videoId ?? '',
      sourceId: c.sourceId,
      voiceIndex: src?.voiceIndex ?? 0,
      claim: c.claim,
      evidence: c.evidence,
      timestamp: c.timestamp,
      confidence: c.confidence,
    }
  })
}

export async function generateRelationshipCandidates(
  claims: SurvivalClaim[],
): Promise<
  Array<{
    fromClaimId: string
    toClaimId: string
    type: SurvivalRelationship['type']
    rationale: string
    confidence: ConfidenceLevel
  }>
> {
  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'SURVIVAL_RELATIONSHIPS',
    system: CANDIDATE_SYSTEM,
    user: `Claims:\n\n${formatClaimsForPrompt(claims)}`,
    schema: RelationshipCandidatesSchema,
    schemaName: 'survival_relationship_candidates',
    maxOutputTokens: 6000,
  })
  return parsed.candidates
}

export async function verifyRelationships(
  claims: SurvivalClaim[],
  candidates: Awaited<ReturnType<typeof generateRelationshipCandidates>>,
): Promise<{ verified: SurvivalRelationship[]; rejected: RejectedRelationship[] }> {
  if (candidates.length === 0) {
    return { verified: [], rejected: [] }
  }

  const openai = getOpenAIClient()
  const claimById = new Map(claims.map((c) => [c.claimId, c]))
  const candidateText = candidates
    .map(
      (c) =>
        `${c.fromClaimId} ↔ ${c.toClaimId} (${c.type}, ${c.confidence}): ${c.rationale}`,
    )
    .join('\n')

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'SURVIVAL_VERIFY',
    system: VERIFY_SYSTEM,
    user: `Claims:\n${formatClaimsForPrompt(claims)}\n\nCandidates to verify:\n${candidateText}`,
    schema: RelationshipVerificationSchema,
    schemaName: 'survival_relationship_verification',
    maxOutputTokens: 8000,
  })

  const rawVerified: SurvivalRelationship[] = []
  for (const [i, v] of parsed.verified.entries()) {
    const from = claimById.get(v.fromClaimId)
    const to = claimById.get(v.toClaimId)
    if (!from || !to) continue
    if (from.videoId === to.videoId) continue
    if (v.confidence === 'weak') continue
    if (
      MIN_RELATIONSHIP_CONFIDENCE === 'moderate' &&
      v.confidence !== 'strong' &&
      v.confidence !== 'moderate'
    ) {
      continue
    }
    rawVerified.push({
      id: `rel_${i + 1}`,
      fromClaimId: v.fromClaimId,
      toClaimId: v.toClaimId,
      fromVideoId: from.videoId,
      toVideoId: to.videoId,
      type: v.type,
      explanation: v.explanation,
      confidence: v.confidence,
    })
  }

  const verified = filterVerifiedRelationships(rawVerified, claimById)

  return { verified, rejected: parsed.rejected }
}

const EMERGENT_SYSTEM = `You find emergent insights that appear ONLY when multiple videos are read together.

Rules:
- Max 2 insights. Set noEmergentInsight=true if none qualify.
- Each insight must cite a reasoningPath with at least 2 steps using existing claimId and relationship id refs.
- Must span at least 2 different videos via the reasoning path.
- Do NOT restate a single video's claim. Do NOT use generic platitudes.
- confidence: strong | moderate only (no weak).`

export async function generateEmergentInsights(input: {
  claims: SurvivalClaim[]
  verifiedRelationships: SurvivalRelationship[]
  topicCoherence: TopicCoherence
}): Promise<EmergentInsight[]> {
  if (input.verifiedRelationships.length < 2) return []

  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'SURVIVAL_EMERGENT',
    system: EMERGENT_SYSTEM,
    user: `Central question: ${input.topicCoherence.centralQuestion}

Claims:
${formatClaimsForPrompt(input.claims)}

Verified relationships:
${formatVerifiedForPrompt(input.verifiedRelationships)}`,
    schema: EmergentInsightsOnlySchema,
    schemaName: 'survival_emergent_insights',
    maxOutputTokens: 3000,
  })

  if (parsed.noEmergentInsight || parsed.emergentInsights.length === 0) return []

  const claimById = new Map(input.claims.map((c) => [c.claimId, c]))
  const relById = new Map(input.verifiedRelationships.map((r) => [r.id, r]))
  return filterEmergentInsights(parsed.emergentInsights, input.claims, claimById, relById)
}

export async function buildSurvivalSynthesis(input: {
  sources: SourceAnalysis[]
  claims: SurvivalClaim[]
  verifiedRelationships: SurvivalRelationship[]
  topicCoherence: TopicCoherence
  excludedSources: ExcludedSource[]
}): Promise<
  Omit<
    SurvivalAnalysis,
    | 'version'
    | 'createdAt'
    | 'claims'
    | 'verifiedRelationships'
    | 'rejectedRelationships'
    | 'topicCoherence'
    | 'excludedSources'
    | 'analyzedVideoCount'
    | 'excludedVideoCount'
  >
> {
  const openai = getOpenAIClient()
  const sourceMeta = input.sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
  }))

  const excludedNote =
    input.excludedSources.length > 0
      ? `\nExcluded off-topic videos (DO NOT use in synthesis): ${JSON.stringify(
          input.excludedSources.map((e) => ({
            title: e.title,
            reason: e.reason,
          })),
        )}`
      : ''

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'SURVIVAL_SYNTHESIS',
    system: SYNTHESIS_SYSTEM,
    user: `Central question: ${input.topicCoherence.centralQuestion}
Coherence: ${input.topicCoherence.coherenceLevel}
${excludedNote}

Included sources: ${JSON.stringify(sourceMeta)}

Claims:
${formatClaimsForPrompt(input.claims)}

Verified relationships:
${formatVerifiedForPrompt(input.verifiedRelationships) || '(none — do not invent relationships)'}`,
    schema: SurvivalSynthesisSchema,
    schemaName: 'survival_synthesis',
    maxOutputTokens: 8000,
  })

  const sourceById = new Map(input.sources.map((s) => [s.sourceId, s]))
  const claimById = new Map(input.claims.map((c) => [c.claimId, c]))

  const assessmentBySource = new Map(
    input.topicCoherence.assessments.map((a) => [a.sourceId, a]),
  )

  const sources = input.sources.map((s) => {
    const pos = parsed.sourcePositions.find((p) => p.sourceId === s.sourceId)
    const assessment = assessmentBySource.get(s.sourceId)
    return {
      videoId: s.videoId,
      sourceId: s.sourceId,
      voiceIndex: s.voiceIndex,
      title: s.title,
      channel: '',
      position: pos?.position ?? s.thesis?.slice(0, 80) ?? s.title,
      includedInSynthesis: true,
      relevance: assessment?.relevance,
    }
  })

  const disagreements = parsed.disagreements
    .map((d): DisagreementItem | null => {
      const sideAClaim = d.sideA.claimId ? claimById.get(d.sideA.claimId) : undefined
      const sideBClaim = d.sideB.claimId ? claimById.get(d.sideB.claimId) : undefined
      const claimTextA = d.sideA.claimText || sideAClaim?.claim || ''
      const claimTextB = d.sideB.claimText || sideBClaim?.claim || ''

      if (isAbstractDisagreementLabel(d.sideA.label, claimTextA)) return null
      if (isAbstractDisagreementLabel(d.sideB.label, claimTextB)) return null
      if (!claimTextA || !claimTextB) return null
      if (claimTextA.length < 15 || claimTextB.length < 15) return null

      return {
        id: d.id,
        title: d.title,
        oneLineSummary: d.oneLineSummary,
        sideA: {
          label: d.sideA.label,
          claimText: claimTextA,
          claimId: d.sideA.claimId ?? sideAClaim?.claimId ?? undefined,
          sourceIds: d.sideA.sourceIds,
          videoIds: d.sideA.sourceIds
            .map((sid) => sourceById.get(sid)?.videoId)
            .filter((id): id is string => Boolean(id)),
        },
        sideB: {
          label: d.sideB.label,
          claimText: claimTextB,
          claimId: d.sideB.claimId ?? sideBClaim?.claimId ?? undefined,
          sourceIds: d.sideB.sourceIds,
          videoIds: d.sideB.sourceIds
            .map((sid) => sourceById.get(sid)?.videoId)
            .filter((id): id is string => Boolean(id)),
        },
        confidence: d.confidence,
      }
    })
    .filter((d): d is DisagreementItem => d !== null)

  const llmConsensus = parsed.consensus.map((c) => ({
    id: c.id,
    title: c.title,
    oneLineSummary: c.oneLineSummary,
    supportingVideoIds: c.supportingSourceIds
      .map((sid) => sourceById.get(sid)?.videoId)
      .filter((id): id is string => Boolean(id)),
    confidence: c.confidence,
  }))
  const consensus = deriveConsensusFromRelationships(
    input.verifiedRelationships,
    claimById,
    llmConsensus,
  )

  const uncertainClaims = parsed.uncertainClaims
    .map((u) => {
      const claim = claimById.get(u.claimId)
      if (!claim) return null
      return {
        claimId: u.claimId,
        videoId: claim.videoId,
        claim: claim.claim,
        signal: u.signal,
        reason: u.reason,
      }
    })
    .filter((u): u is NonNullable<typeof u> => u !== null)

  const relById = new Map(input.verifiedRelationships.map((r) => [r.id, r]))
  const emergentInsights =
    parsed.noEmergentInsight || parsed.emergentInsights.length === 0
      ? []
      : filterEmergentInsights(parsed.emergentInsights, input.claims, claimById, relById)

  return {
    sources,
    consensus,
    disagreements,
    uncertainClaims,
    synthesis: {
      headline: parsed.synthesis.headline,
      explanation: parsed.synthesis.explanation,
      confidence: parsed.synthesis.confidence,
      judgmentBasis: parsed.synthesis.judgmentBasis ?? undefined,
    },
    emergentInsights,
    emergentInsightMissing: emergentInsights.length === 0,
    knowledgeGaps: parsed.knowledgeGaps,
    landscape: parsed.landscape,
  }
}
