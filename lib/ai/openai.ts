import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAIApiKey, isSynthesisFastMode } from '@/lib/ai/config'
import { buildCompactAskPayload, compactSourcesForPrompt } from '@/lib/ai/compact-prompt'
import {
  deriveSourceReasoning,
  toSynthesisVideoContexts,
} from '@/lib/ai/synthesis-video-context'
import {
  compactRelationshipGraphForPrompt,
  compactSetAnalysisForPrompt,
} from '@/lib/ai/compact-relationship'
import { callStructured } from '@/lib/ai/structured-call'
import type {
  AIProvider,
  AnalyzeSourceInput,
  AnswerAcrossSourcesInput,
  CombinedSynthesisLLMResult,
  DiscoverRelationshipsInput,
  RunCombinedSynthesisInput,
  RunKnowledgeExtensionInput,
  RunSynthesisInput,
} from '@/lib/ai/provider'
import type { AskAnswer, SynthesisResult } from '@/lib/types/analysis'
import type { Insight, RelationshipGraph } from '@/lib/types/relationship'
import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import { computeRelationshipStats } from '@/lib/synthesis/relationship-stats'
import { DEFAULT_SYNTHESIS_MODE, SYNTHESIS_MODE_FOCUS, parseSynthesisMode } from '@/lib/types/synthesis-mode'
import { buildSingleVideoSystemPrompt } from '@/lib/prompts/single-video-prompt'
import { RELATIONSHIP_SYSTEM_PROMPT } from '@/lib/prompts/relationship-prompt'
import {
  SYNTHESIS_SYSTEM_PROMPT,
  COMBINED_SYNTHESIS_SYSTEM_PROMPT,
} from '@/lib/prompts/synthesis-prompt'
import { FOURTH_IDEA_SYSTEM_PROMPT } from '@/lib/prompts/fourth-idea-prompt'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import type { ResolvedOutputLanguage } from '@/lib/i18n/types'
import type { RunFourthIdeaInput } from '@/lib/ai/provider'
import type { FourthIdea } from '@/lib/types/fourth-idea'

function withOutputLanguage(system: string, lang?: ResolvedOutputLanguage): string {
  if (!lang) return system
  return `${system}\n\n${buildOutputLanguageInstruction(lang)}`
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIApiKey() })
  }
  return client
}

const EvidenceSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  text: z.string(),
})

const ClaimSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  statement: z.string(),
  topic: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().nullable(),
  evidenceSummary: z.string().nullable(),
})

const DeepInsightSchema = z.object({
  insight: z.string(),
  whyItMatters: z.string(),
  supportingReasoning: z.string(),
})

const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
})

const SourceAnalysisSchema = z.object({
  sourceId: z.string(),
  videoId: z.string(),
  voiceIndex: z.number(),
  title: z.string(),
  summary: z.string(),
  thesis: z.string(),
  topics: z.array(z.string()),
  claims: z.array(ClaimSchema),
  entities: z.array(EntitySchema),
  conclusions: z.array(z.string()),
  mainClaims: z.array(z.string()),
  keyFacts: z.array(z.string()),
  keyPeople: z.array(z.string()),
  keyTopics: z.array(z.string()),
  arguments: z.array(z.string()),
  evidence: z.array(EvidenceSchema),
  implications: z.array(z.string()),
  stance: z.string().nullable(),
  centralQuestion: z.string().nullable(),
  assumptions: z.array(z.string()).nullable(),
  counterArguments: z.array(z.string()).nullable(),
  limitations: z.array(z.string()).nullable(),
  keyArguments: z.array(z.string()).nullable(),
  importantConcepts: z.array(z.string()).nullable(),
  uniquePerspective: z.string().nullable(),
  deepInsights: z.array(DeepInsightSchema).nullable(),
})

const ClaimRelationshipSchema = z.object({
  id: z.string(),
  fromClaimId: z.string(),
  toClaimId: z.string(),
  fromSourceId: z.string(),
  toSourceId: z.string(),
  type: z.enum([
    'agreement',
    'partial_agreement',
    'disagreement',
    'complementary',
    'structural_parallel',
    'shared_topic',
    'independent',
  ]),
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
})

const SourceClusterSchema = z.object({
  id: z.string(),
  label: z.string(),
  topic: z.string(),
  sourceIds: z.array(z.string()).min(1),
  explanation: z.string(),
})

const RelationshipGraphSchema = z.object({
  relationships: z.array(ClaimRelationshipSchema),
  clusters: z.array(SourceClusterSchema),
  independentSourceIds: z.array(z.string()),
})

const SourceReasoningSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  coreClaims: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
})

const CrossSourcePatternSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  relationshipIds: z.array(z.string()),
  sourceIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

const SynthesisPointSchema = z.object({
  id: z.string(),
  section: z.enum([
    'agreement',
    'disagreement',
    'shared_thread',
    'different_directions',
    'unique_view',
    'hidden_connection',
  ]),
  label: z.string(),
  statement: z.string(),
  sourceIds: z.array(z.string()),
  claimIds: z.array(z.string()),
  supportCount: z.number(),
  totalSources: z.number(),
  confidence: z.number().min(0).max(1),
})

const SynthesisFindingSchema = z.object({
  finding: z.string(),
  explanation: z.string(),
  supportingSourceIds: z.array(z.string()),
})

const SynthesisTensionSchema = z.object({
  issue: z.string(),
  explanation: z.string(),
})

const SynthesisConclusionSchema = z.object({
  synthesisType: z.enum([
    'strong_consensus',
    'mixed',
    'divergent',
    'clustered',
    'mostly_independent',
  ]),
  topic: z.string(),
  bottomLine: z.string(),
  bottomLineHeadline: z.array(z.string()).nullable(),
  overallConclusion: z.string(),
  emergentStatement: z.string(),
  sections: z.array(SynthesisPointSchema).max(6),
  usedSourceIds: z.array(z.string()),
  sourceContributions: z.array(
    z.object({
      sourceId: z.string(),
      contribution: z.string(),
    }),
  ),
  noStrongRelationship: z.boolean(),
  integratedReasoning: z.string().nullable(),
  keyFindings: z.array(SynthesisFindingSchema).max(4).nullable(),
  tensions: z.array(SynthesisTensionSchema).max(4).nullable(),
  unresolvedQuestions: z.array(z.string()).nullable(),
  finalInsight: z.string().nullable(),
})

const InsightSchema = z.object({
  id: z.string(),
  statement: z.string(),
  type: z.enum(['direct', 'cross_source_inference', 'interpretive']),
  sourceIds: z.array(z.string()),
  claimIds: z.array(z.string()),
  relationshipIds: z.array(z.string()),
  patternIds: z.array(z.string()),
  noveltyScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  derivation: z.string(),
  observation: z.string().nullable(),
  reasoning: z.string().nullable(),
  evidenceSummary: z.string().nullable(),
  implication: z.string().nullable(),
})

const SynthesisResultSchema = z.object({
  patterns: z.array(CrossSourcePatternSchema).max(4),
  synthesis: SynthesisConclusionSchema,
  insights: z.array(InsightSchema).min(2).max(4),
})

const CombinedSynthesisSchema = z.object({
  relationships: z.array(ClaimRelationshipSchema),
  clusters: z.array(SourceClusterSchema).max(8),
  independentSourceIds: z.array(z.string()),
  patterns: z.array(CrossSourcePatternSchema).max(4),
  synthesis: SynthesisConclusionSchema,
  insights: z.array(InsightSchema).min(2).max(4),
})

const KnowledgeGapSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string(),
  knownClaimIds: z.array(z.string()),
  relatedSourceIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

const KnowledgeRecommendationSchema = z.object({
  id: z.string(),
  type: z.enum(['deepen', 'counter', 'bridge', 'evidence', 'missing_piece']),
  searchQuery: z.string(),
  title: z.string(),
  reason: z.string(),
  gapId: z.string().nullable(),
  relatedSourceIds: z.array(z.string()),
  relatedClaimIds: z.array(z.string()),
})

const KnowledgeExtensionSchema = z.object({
  gaps: z.array(KnowledgeGapSchema),
  recommendations: z.array(KnowledgeRecommendationSchema),
})

const AskAnswerSchema = z.object({
  answer: z.string(),
  usedSourceIds: z.array(z.string()),
  evidence: z.array(
    z.object({
      videoId: z.string(),
      timestamp: z.number(),
      text: z.string(),
    }),
  ),
})

const FourthIdeaLLMSchema = z.object({
  idea: z.string().nullable(),
  derivedFrom: z.array(
    z.object({
      sourceId: z.string(),
      claimId: z.string().nullable(),
      claimStatement: z.string(),
    }),
  ),
  reasoning: z.string(),
  whyNovel: z.string(),
  counterArgument: z.string(),
  questionsToExplore: z.array(z.string()),
})

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value
}

function normalizeParsedSourceAnalysis(
  parsed: z.infer<typeof SourceAnalysisSchema>,
  source: AnalyzeSourceInput['source'],
): SourceAnalysis {
  return normalizeSourceAnalysis({
    ...parsed,
    sourceId: source.sourceId,
    videoId: source.videoId,
    voiceIndex: source.voiceIndex,
    title: source.title,
    stance: parsed.stance ?? null,
    centralQuestion: nullToUndefined(parsed.centralQuestion),
    assumptions: nullToUndefined(parsed.assumptions),
    counterArguments: nullToUndefined(parsed.counterArguments),
    limitations: nullToUndefined(parsed.limitations),
    keyArguments: nullToUndefined(parsed.keyArguments),
    importantConcepts: nullToUndefined(parsed.importantConcepts),
    uniquePerspective: nullToUndefined(parsed.uniquePerspective),
    deepInsights: nullToUndefined(parsed.deepInsights),
    claims: parsed.claims.map((claim) => ({
      ...claim,
      reasoning: nullToUndefined(claim.reasoning),
      evidenceSummary: nullToUndefined(claim.evidenceSummary),
    })),
  })
}

function normalizeSynthesisConclusionOutput(
  synthesis: z.infer<typeof SynthesisConclusionSchema>,
) {
  const enriched = enrichSynthesisConclusion(synthesis)
  return {
    ...enriched,
    bottomLineHeadline: enriched.bottomLineHeadline ?? undefined,
    integratedReasoning: nullToUndefined(enriched.integratedReasoning),
    keyFindings: nullToUndefined(enriched.keyFindings),
    tensions: nullToUndefined(enriched.tensions),
    unresolvedQuestions: nullToUndefined(enriched.unresolvedQuestions),
    finalInsight: nullToUndefined(enriched.finalInsight),
  }
}

function enrichInsightDerivation(insight: z.infer<typeof InsightSchema>): Insight {
  const observation = nullToUndefined(insight.observation)
  const reasoning = nullToUndefined(insight.reasoning)
  const evidenceSummary = nullToUndefined(insight.evidenceSummary)
  const implication = nullToUndefined(insight.implication)

  if (!observation && !reasoning && !evidenceSummary && !implication) {
    return {
      id: insight.id,
      statement: insight.statement,
      type: insight.type,
      sourceIds: insight.sourceIds,
      claimIds: insight.claimIds,
      relationshipIds: insight.relationshipIds,
      patternIds: insight.patternIds,
      noveltyScore: insight.noveltyScore,
      confidence: insight.confidence,
      derivation: insight.derivation,
      observation,
      reasoning,
      evidenceSummary,
      implication,
    }
  }

  const parts = [
    observation ? `OBSERVATION\n${observation}` : '',
    reasoning ? `WHY\n${reasoning}` : '',
    evidenceSummary ? `EVIDENCE\n${evidenceSummary}` : '',
    implication ? `IMPLICATION\n${implication}` : '',
  ].filter(Boolean)
  const enriched = parts.join('\n\n')

  return {
    id: insight.id,
    statement: insight.statement,
    type: insight.type,
    sourceIds: insight.sourceIds,
    claimIds: insight.claimIds,
    relationshipIds: insight.relationshipIds,
    patternIds: insight.patternIds,
    noveltyScore: insight.noveltyScore,
    confidence: insight.confidence,
    derivation: enriched.length > insight.derivation.length ? enriched : insight.derivation,
    observation,
    reasoning,
    evidenceSummary,
    implication,
  }
}

function enrichSynthesisConclusion(
  synthesis: z.infer<typeof SynthesisConclusionSchema>,
): z.infer<typeof SynthesisConclusionSchema> {
  return {
    ...synthesis,
    overallConclusion: synthesis.integratedReasoning?.trim() || synthesis.overallConclusion,
    emergentStatement: synthesis.finalInsight?.trim() || synthesis.emergentStatement,
  }
}

function buildCombinedSynthesisUserMessage(input: RunCombinedSynthesisInput): string {
  const mode = parseSynthesisMode(input.mode ?? DEFAULT_SYNTHESIS_MODE)
  const parts = [
    `Question / topic: ${input.question ?? 'Synthesize these sources without forcing consensus'}`,
    `Synthesis mode: ${mode}`,
    `Mode focus: ${SYNTHESIS_MODE_FOCUS[mode]}`,
    `Total sources: ${input.sources.length}`,
    `Required source IDs: ${input.sources.map((s) => s.sourceId).join(', ')}`,
  ]

  if (input.failedSources?.length) {
    parts.push(
      `Note: ${input.failedSources.length} source(s) failed: ${input.failedSources.map((f) => f.sourceId).join(', ')}`,
    )
  }

  if (input.missingSourceIds?.length) {
    parts.push(`RETRY: Previous synthesis missed sources: ${input.missingSourceIds.join(', ')}.`)
  }

  parts.push(
    'Per-source structured knowledge (JSON):',
    JSON.stringify(
      toSynthesisVideoContexts(input.sources, {
        maxClaims: isSynthesisFastMode() ? 5 : 6,
        maxEvidence: isSynthesisFastMode() ? 1 : 2,
      }),
      null,
      2,
    ),
  )

  return parts.join('\n\n')
}

const KNOWLEDGE_EXTENSION_SYSTEM = `You are a Knowledge Gap and Discovery Engine for multi-source synthesis.

Given structured set analysis and synthesis results:

1. KNOWLEDGE GAPS — What important questions do the sources NOT answer?
2. RECOMMENDATIONS — YouTube search queries to explore next

If no meaningful gaps exist, return empty gaps array.
Return valid JSON.`

function formatTranscript(chunks: AnalyzeSourceInput['transcript']): string {
  return chunks.map((c) => `[${Math.floor(c.start)}s] ${c.text}`).join('\n')
}

function buildRelationshipUserMessage(input: DiscoverRelationshipsInput): string {
  const contexts = toSynthesisVideoContexts(input.sources, { maxClaims: 8, maxEvidence: 2 })
  return [
    `Total sources: ${input.sources.length}`,
    `Source IDs: ${input.sources.map((s) => s.sourceId).join(', ')}`,
    'Test claim pairs across all sources. Include independent relationships for pairs with no connection.',
    'Per-source structured knowledge (JSON):',
    JSON.stringify(contexts, null, 2),
  ].join('\n\n')
}

function buildSynthesisUserMessage(input: RunSynthesisInput): string {
  const mode = parseSynthesisMode(input.mode ?? DEFAULT_SYNTHESIS_MODE)
  const fast = isSynthesisFastMode()
  const contexts = toSynthesisVideoContexts(input.sources, {
    maxClaims: fast ? 5 : 6,
    maxEvidence: fast ? 1 : 2,
  })
  const parts = [
    `Question / topic: ${input.question ?? 'Synthesize these sources without forcing consensus'}`,
    `Synthesis mode: ${mode}`,
    `Mode focus: ${SYNTHESIS_MODE_FOCUS[mode]}`,
    `Total sources: ${input.sources.length}`,
    `Required source IDs: ${input.sources.map((s) => s.sourceId).join(', ')}`,
  ]

  if (input.failedSources?.length) {
    parts.push(
      `Note: ${input.failedSources.length} source(s) failed: ${input.failedSources.map((f) => f.sourceId).join(', ')}`,
    )
  }

  if (input.missingSourceIds?.length) {
    parts.push(`RETRY: Previous synthesis missed sources: ${input.missingSourceIds.join(', ')}.`)
  }

  parts.push(
    'Set analysis (intersection/difference/contradiction):',
    JSON.stringify(compactSetAnalysisForPrompt(input.setAnalysis ?? {
      intersections: [],
      differences: [],
      contradictions: [],
      noStrongIntersection: true,
    }), null, 2),
    'Relationship graph (JSON):',
    JSON.stringify(compactRelationshipGraphForPrompt(input.graph), null, 2),
    'Per-source structured knowledge (JSON) — do NOT re-summarize; build on these claims:',
    JSON.stringify(contexts, null, 2),
  )

  return parts.join('\n\n')
}

function buildFourthIdeaUserMessage(input: RunFourthIdeaInput): string {
  const parts = [
    `Total sources: ${input.sources.length}`,
    `Source IDs: ${input.sources.map((s) => s.sourceId).join(', ')}`,
    'Set analysis (intersection/difference/contradiction):',
    JSON.stringify(compactSetAnalysisForPrompt(input.setAnalysis), null, 2),
    'Relationship graph (top relationships):',
    JSON.stringify(compactRelationshipGraphForPrompt(input.graph), null, 2),
    'Synthesis conclusion (from prior stage — do not re-derive):',
    JSON.stringify(
      {
        topic: input.synthesis.topic,
        bottomLine: input.synthesis.bottomLine,
        integratedReasoning: input.synthesis.integratedReasoning?.slice(0, 1200),
        emergentStatement: input.synthesis.emergentStatement,
        finalInsight: input.synthesis.finalInsight,
        keyFindings: input.synthesis.keyFindings?.slice(0, 4),
        tensions: input.synthesis.tensions?.slice(0, 3),
      },
      null,
      2,
    ),
    'Cross-source patterns:',
    JSON.stringify(input.patterns.slice(0, 3), null, 2),
    'Emergent insights (from prior stage):',
    JSON.stringify(
      input.insights.slice(0, 4).map((i) => ({
        id: i.id,
        statement: i.statement,
        sourceIds: i.sourceIds,
        observation: i.observation,
        reasoning: i.reasoning,
        implication: i.implication,
      })),
      null,
      2,
    ),
  ]
  return parts.join('\n\n')
}

function fourthIdeaFromLLM(
  parsed: z.infer<typeof FourthIdeaLLMSchema>,
  input: RunFourthIdeaInput,
): FourthIdea | null {
  const idea = parsed.idea?.trim()
  if (!idea) return null

  const sourceIds = [...new Set(parsed.derivedFrom.map((d) => d.sourceId))]
  const claimIds = parsed.derivedFrom
    .map((d) => d.claimId)
    .filter((id): id is string => Boolean(id))

  const explanationParts = [
    parsed.reasoning,
    parsed.whyNovel ? `Why novel: ${parsed.whyNovel}` : '',
    parsed.counterArgument ? `Counter-argument: ${parsed.counterArgument}` : '',
  ].filter(Boolean)

  const patternIds = input.patterns.slice(0, 2).map((p) => p.id)
  const relationshipIds = input.graph.relationships.slice(0, 4).map((r) => r.id)

  return {
    id: 'fourth_llm',
    statement: idea,
    explanation: explanationParts.join('\n\n'),
    sourceIds: sourceIds.length > 0 ? sourceIds : input.synthesis.usedSourceIds,
    claimIds,
    relationshipIds,
    patternIds,
    noveltyScore: 0.75,
    specificityScore: Math.min(0.95, 0.4 + idea.split(/\s+/).length * 0.015),
    confidence: sourceIds.length >= 2 ? 0.72 : 0.58,
    derivationSummary: parsed.reasoning.slice(0, 280),
    multiSourceDependency: sourceIds.length >= 2,
    derivedFrom: parsed.derivedFrom.map((d) => ({
      sourceId: d.sourceId,
      claimId: nullToUndefined(d.claimId),
      claimStatement: d.claimStatement,
    })),
    whyNovel: parsed.whyNovel,
    counterArgument: parsed.counterArgument,
    questionsToExplore: parsed.questionsToExplore,
  }
}

export const openaiProvider: AIProvider = {
  async analyzeSource(input: AnalyzeSourceInput): Promise<SourceAnalysis> {
    const { source } = input
    const operation = input.operation ?? 'VIDEO_ANALYSIS'
    const system = buildSingleVideoSystemPrompt(source.sourceId)

    const user = `sourceId: ${source.sourceId}
videoId: ${source.videoId}
voiceIndex: ${source.voiceIndex}
title: ${source.title}
channel: ${source.channel}

Transcript:
${formatTranscript(input.transcript)}`

    const parsed = await callStructured({
      openai: getClient(),
      role: 'analysis',
      operation,
      system,
      user,
      schema: SourceAnalysisSchema,
      schemaName: 'source_analysis',
      youtubeVideoId: source.videoId,
    })

    return normalizeParsedSourceAnalysis(parsed, source)
  },

  async discoverRelationships(input: DiscoverRelationshipsInput): Promise<RelationshipGraph> {
    const user = buildRelationshipUserMessage(input)
    const system = RELATIONSHIP_SYSTEM_PROMPT
    const contexts = toSynthesisVideoContexts(input.sources, { maxClaims: 8, maxEvidence: 2 })
    const parsed = await callStructured({
      openai: getClient(),
      role: 'synthesis',
      operation: 'RELATIONSHIP',
      system,
      user,
      schema: RelationshipGraphSchema,
      schemaName: 'relationship_graph',
      contextObjectSize: JSON.stringify(contexts).length,
      maxOutputTokens: 2400,
    })

    return {
      ...parsed,
      stats: computeRelationshipStats(parsed.relationships),
    }
  },

  async runSynthesis(input: RunSynthesisInput): Promise<SynthesisResult> {
    const user = buildSynthesisUserMessage(input)
    const system = withOutputLanguage(SYNTHESIS_SYSTEM_PROMPT, input.outputLanguage)
    const contexts = toSynthesisVideoContexts(input.sources, {
      maxClaims: isSynthesisFastMode() ? 5 : 6,
      maxEvidence: isSynthesisFastMode() ? 1 : 2,
    })
    const parsed = await callStructured({
      openai: getClient(),
      role: 'synthesis',
      operation: 'SYNTHESIS',
      system,
      user,
      schema: SynthesisResultSchema,
      schemaName: 'synthesis_result',
      contextObjectSize: JSON.stringify({
        contexts,
        graph: compactRelationshipGraphForPrompt(input.graph),
        setAnalysis: compactSetAnalysisForPrompt(input.setAnalysis ?? {
          intersections: [],
          differences: [],
          contradictions: [],
          noStrongIntersection: true,
        }),
      }).length,
      maxOutputTokens: 3200,
      retries: 1,
    })

    const synthesis = normalizeSynthesisConclusionOutput(parsed.synthesis)

    return {
      sources: deriveSourceReasoning(input.sources),
      relationships: input.graph.relationships,
      patterns: parsed.patterns,
      setAnalysis: input.setAnalysis ?? {
        intersections: [],
        differences: [],
        contradictions: [],
        noStrongIntersection: true,
      },
      synthesis,
      insights: parsed.insights.map(enrichInsightDerivation),
      knowledge: { gaps: [], recommendations: [], rejectedInsights: [] },
      relationshipGraph: input.graph,
    }
  },

  async runCombinedSynthesis(input: RunCombinedSynthesisInput): Promise<CombinedSynthesisLLMResult> {
    const user = buildCombinedSynthesisUserMessage(input)
    const system = withOutputLanguage(COMBINED_SYNTHESIS_SYSTEM_PROMPT, input.outputLanguage)
    const contexts = toSynthesisVideoContexts(input.sources, {
      maxClaims: isSynthesisFastMode() ? 5 : 6,
      maxEvidence: isSynthesisFastMode() ? 1 : 2,
    })
    const parsed = await callStructured({
      openai: getClient(),
      role: 'synthesis',
      operation: 'COMBINED_SYNTHESIS',
      system,
      user,
      schema: CombinedSynthesisSchema,
      schemaName: 'combined_synthesis',
      retries: 1,
      contextObjectSize: JSON.stringify(contexts).length,
      maxOutputTokens: 4000,
    })

    const synthesis = normalizeSynthesisConclusionOutput(parsed.synthesis)

    return {
      graph: {
        relationships: parsed.relationships,
        clusters: parsed.clusters,
        independentSourceIds: parsed.independentSourceIds,
        stats: computeRelationshipStats(parsed.relationships),
      },
      sources: deriveSourceReasoning(input.sources),
      patterns: parsed.patterns,
      synthesis,
      insights: parsed.insights.map(enrichInsightDerivation),
    }
  },

  async runFourthIdea(input: RunFourthIdeaInput): Promise<FourthIdea | null> {
    if (input.sources.length < 2) return null

    const user = buildFourthIdeaUserMessage(input)
    const system = withOutputLanguage(FOURTH_IDEA_SYSTEM_PROMPT, input.outputLanguage)
    const parsed = await callStructured({
      openai: getClient(),
      role: 'synthesis',
      operation: 'FOURTH_IDEA',
      system,
      user,
      schema: FourthIdeaLLMSchema,
      schemaName: 'fourth_idea',
      contextObjectSize: user.length,
      maxOutputTokens: 1200,
      retries: 1,
    })

    return fourthIdeaFromLLM(parsed, input)
  },

  async runKnowledgeExtension(input: RunKnowledgeExtensionInput) {
    const user = [
      'Set analysis:',
      JSON.stringify(input.setAnalysis, null, 2),
      'Synthesis:',
      JSON.stringify(
        {
          synthesis: input.synthesis.synthesis,
          patterns: input.synthesis.patterns,
          insights: input.synthesis.insights,
        },
        null,
        2,
      ),
      'Sources:',
      JSON.stringify(
        compactSourcesForPrompt(input.sources, { maxClaims: 8, maxEvidence: 2 }),
        null,
        2,
      ),
    ].join('\n\n')

    const parsed = await callStructured({
      openai: getClient(),
      role: 'synthesis',
      operation: 'KNOWLEDGE_EXTENSION',
      system: KNOWLEDGE_EXTENSION_SYSTEM,
      user,
      schema: KnowledgeExtensionSchema,
      schemaName: 'knowledge_extension',
    })

    return {
      gaps: parsed.gaps,
      recommendations: parsed.recommendations.map((r) => ({
        ...r,
        gapId: r.gapId ?? undefined,
      })),
      rejectedInsights: input.synthesis.knowledge?.rejectedInsights ?? [],
    }
  },

  async answerAcrossSources(input: AnswerAcrossSourcesInput): Promise<AskAnswer> {
    const system = withOutputLanguage(
      `You answer questions about a multi-source synthesis.

Use the structured synthesis reasoning and relevant transcript excerpts.
Cite evidence with timestamps where relevant.
Return valid JSON.`,
      input.outputLanguage,
    )

    const compact = buildCompactAskPayload({
      question: input.question,
      synthesis: input.synthesis,
      sources: input.sources,
      relevantChunks: input.relevantChunks,
    })

    const parts = [
      `Question: ${input.question}`,
      `Required sources: ${input.sources.map((s) => s.sourceId).join(', ')}`,
    ]

    if (input.missingSourceIds?.length) {
      parts.push(`RETRY: Include sources: ${input.missingSourceIds.join(', ')}.`)
    }

    parts.push(
      `Synthesis:\n${JSON.stringify(compact.synthesis, null, 2)}`,
      `Per-source knowledge:\n${JSON.stringify(compact.sources, null, 2)}`,
      `Relevant transcript excerpts:\n${JSON.stringify(compact.relevantChunks, null, 2)}`,
    )

    return callStructured({
      openai: getClient(),
      role: 'ask',
      operation: 'ASK',
      system,
      user: parts.join('\n\n'),
      schema: AskAnswerSchema,
      schemaName: 'ask_answer',
    })
  },
}

export function getAIProvider(): AIProvider {
  return openaiProvider
}

export { AI_CONFIG } from '@/lib/ai/config'
