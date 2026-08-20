import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { TranscriptChunk } from '@/lib/ai/provider'

export type CompactSourceOptions = {
  maxClaims?: number
  maxEvidence?: number
  includeCoverage?: boolean
  includeEntities?: boolean
}

const DEFAULT_COMPACT: Required<CompactSourceOptions> = {
  maxClaims: 12,
  maxEvidence: 4,
  includeCoverage: true,
  includeEntities: false,
}

export function compactSourcesForPrompt(
  sources: SourceAnalysis[],
  options?: CompactSourceOptions,
): unknown[] {
  const opts = { ...DEFAULT_COMPACT, ...options }

  return sources.map((s) => {
    const n = normalizeSourceAnalysis(s)
    const claims = [...n.claims]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, opts.maxClaims)
    const evidence = [...n.evidence]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, opts.maxEvidence)

    return {
      sourceId: n.sourceId,
      title: n.title,
      summary: n.summary,
      thesis: n.thesis,
      centralQuestion: n.centralQuestion,
      topics: n.topics.slice(0, 8),
      claims,
      conclusions: n.conclusions.slice(0, 4),
      implications: n.implications.slice(0, 4),
      assumptions: n.assumptions?.slice(0, 4),
      counterArguments: n.counterArguments?.slice(0, 4),
      limitations: n.limitations?.slice(0, 3),
      uniquePerspective: n.uniquePerspective,
      deepInsights: n.deepInsights?.slice(0, 3),
      stance: n.stance,
      evidence,
      ...(opts.includeEntities ? { entities: n.entities.slice(0, 8) } : {}),
      ...(opts.includeCoverage && n.coverage
        ? {
            coverage: {
              coverageRatio: n.coverage.coverageRatio,
              sectionCount: n.coverage.sectionCount,
              deepAnalyzedSectionCount: n.coverage.deepAnalyzedSectionCount,
            },
          }
        : {}),
    }
  })
}

function questionTerms(question: string): string[] {
  return question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
}

function scoreText(terms: string[], text: string): number {
  const lower = text.toLowerCase()
  return terms.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0)
}

export function buildCompactAskPayload(input: {
  question: string
  synthesis: SynthesisResult
  sources: SourceAnalysis[]
  relevantChunks: Array<{ sourceId: string; videoId: string; chunks: TranscriptChunk[] }>
}): {
  synthesis: unknown
  sources: unknown[]
  relevantChunks: typeof input.relevantChunks
} {
  const terms = questionTerms(input.question)

  const relevantRelationships = input.synthesis.relationships
    .filter((r) => scoreText(terms, `${r.explanation} ${r.type}`) > 0)
    .slice(0, 12)

  const relevantPatterns = input.synthesis.patterns
    .filter((p) => scoreText(terms, `${p.label} ${p.description}`) > 0)
    .slice(0, 6)

  const relevantInsights = input.synthesis.insights
    .filter((i) => scoreText(terms, `${i.statement} ${i.derivation}`) > 0)
    .slice(0, 6)

  const relevantFindings = (input.synthesis.findings ?? [])
    .filter((f) => scoreText(terms, `${f.title} ${f.explanation}`) > 0)
    .slice(0, 6)

  const compactSynthesis = {
    topic: input.synthesis.synthesis.topic,
    bottomLine: input.synthesis.synthesis.bottomLine,
    emergentStatement: input.synthesis.synthesis.emergentStatement,
    synthesisType: input.synthesis.synthesis.synthesisType,
    sections: input.synthesis.synthesis.sections.slice(0, 8),
    fourthIdea: input.synthesis.fourthIdea
      ? {
          statement: input.synthesis.fourthIdea.statement,
          explanation: input.synthesis.fourthIdea.explanation,
          sourceIds: input.synthesis.fourthIdea.sourceIds,
          multiSourceDependency: input.synthesis.fourthIdea.sourceIds.length >= 2,
        }
      : null,
    relationships: relevantRelationships.length > 0 ? relevantRelationships : input.synthesis.relationships.slice(0, 8),
    patterns: relevantPatterns.length > 0 ? relevantPatterns : input.synthesis.patterns.slice(0, 4),
    insights: relevantInsights.length > 0 ? relevantInsights : input.synthesis.insights.slice(0, 4),
    findings: relevantFindings,
    setAnalysis: {
      intersections: input.synthesis.setAnalysis.intersections.slice(0, 6),
      differences: input.synthesis.setAnalysis.differences.slice(0, 6),
      contradictions: input.synthesis.setAnalysis.contradictions.slice(0, 6),
      noStrongIntersection: input.synthesis.setAnalysis.noStrongIntersection,
    },
  }

  const compactSources = input.sources.map((raw) => {
    const s = normalizeSourceAnalysis(raw)
    const rankedClaims = [...s.claims]
      .map((c) => ({ c, score: scoreText(terms, `${c.statement} ${c.topic}`) }))
      .sort((a, b) => b.score - a.score)
    const rankedEvidence = [...s.evidence]
      .map((e) => ({ e, score: scoreText(terms, e.text) }))
      .sort((a, b) => b.score - a.score)

    return {
      sourceId: s.sourceId,
      title: s.title,
      thesis: s.thesis,
      summary: s.summary,
      topics: s.topics.slice(0, 8),
      claims: (rankedClaims.some((r) => r.score > 0)
        ? rankedClaims.filter((r) => r.score > 0)
        : rankedClaims
      )
        .slice(0, 8)
        .map((r) => r.c),
      evidence: (rankedEvidence.some((r) => r.score > 0)
        ? rankedEvidence.filter((r) => r.score > 0)
        : rankedEvidence
      )
        .slice(0, 6)
        .map((r) => r.e),
      coverage: s.coverage,
    }
  })

  return {
    synthesis: compactSynthesis,
    sources: compactSources,
    relevantChunks: input.relevantChunks,
  }
}

export function getAnalysisVersionsFromSources(sources: SourceAnalysis[]): string[] {
  return sources.map(
    (s) => s.videoKnowledge?.analysisVersion ?? (s.coverage ? 'legacy-with-coverage' : 'legacy'),
  )
}
