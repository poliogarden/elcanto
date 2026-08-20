import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import type { SourceReasoning } from '@/lib/types/relationship'

/** API-call DTO — compact structured knowledge for synthesis stages (not stored in DB). */
export type SynthesisVideoContext = {
  sourceId: string
  videoId: string
  title: string
  centralQuestion: string | null
  coreClaims: Array<{
    id: string
    claim: string
    reasoning: string | null
  }>
  uniquePerspective: string | null
  keyEvidence: string[]
  limitations: string[]
}

export type SynthesisVideoContextOptions = {
  maxClaims?: number
  maxEvidence?: number
}

const DEFAULT_OPTS: Required<SynthesisVideoContextOptions> = {
  maxClaims: 6,
  maxEvidence: 2,
}

/** Build compact per-video context for relationship / emergent / fourth-idea LLM calls. */
export function toSynthesisVideoContexts(
  sources: SourceAnalysis[],
  options?: SynthesisVideoContextOptions,
): SynthesisVideoContext[] {
  const opts = { ...DEFAULT_OPTS, ...options }

  return sources.map((raw) => {
    const s = normalizeSourceAnalysis(raw)
    const ranked = [...s.claims].sort((a, b) => b.confidence - a.confidence).slice(0, opts.maxClaims)

    return {
      sourceId: s.sourceId,
      videoId: s.videoId,
      title: s.title,
      centralQuestion: s.centralQuestion ?? null,
      coreClaims: ranked.map((c) => ({
        id: c.id,
        claim: c.statement,
        reasoning: c.reasoning ?? c.evidenceSummary ?? null,
      })),
      uniquePerspective: s.uniquePerspective ?? null,
      keyEvidence: [...s.evidence]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, opts.maxEvidence)
        .map((e) => e.text),
      limitations: (s.limitations ?? []).slice(0, 3),
    }
  })
}

/** Deterministic source reasoning — avoids LLM re-generating source summaries in synthesis output. */
export function deriveSourceReasoning(sources: SourceAnalysis[]): SourceReasoning[] {
  return sources.map((raw) => {
    const s = normalizeSourceAnalysis(raw)
    const ranked = [...s.claims].sort((a, b) => b.confidence - a.confidence).slice(0, 6)

    return {
      sourceId: s.sourceId,
      title: s.title,
      coreClaims: ranked.map((c) => ({
        id: c.id,
        statement: c.statement,
        evidenceIds: s.evidence.slice(0, 2).map((e) => e.id),
      })),
    }
  })
}
