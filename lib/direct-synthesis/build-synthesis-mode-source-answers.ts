import { retrieveSourceProfileEvidence } from '@/lib/direct-synthesis/evidence'
import type { DirectSourceAnswer } from '@/lib/direct-synthesis/types'
import type { SourceAnalysis } from '@/lib/types/source'

function buildSourcePerspective(source: SourceAnalysis): string {
  const parts: string[] = []
  if (source.thesis?.trim()) parts.push(source.thesis.trim())
  if (source.summary?.trim()) parts.push(source.summary.trim())
  for (const c of source.conclusions?.slice(0, 2) ?? []) {
    if (c.trim()) parts.push(c.trim())
  }
  for (const k of source.keyArguments?.slice(0, 2) ?? []) {
    if (k.trim()) parts.push(k.trim())
  }
  if (source.uniquePerspective?.trim()) parts.push(source.uniquePerspective.trim())
  if (source.stance?.trim()) parts.push(`Stance: ${source.stance.trim()}`)
  return parts.join(' ') || source.title
}

/**
 * Build per-source inputs for SYNTHESIS_QUESTION without literal question answerability.
 * Uses existing analysis + transcript evidence only (no per-source LLM).
 */
export function buildSynthesisModeSourceAnswers(sources: SourceAnalysis[]): DirectSourceAnswer[] {
  return sources.map((source) => {
    const snippets = retrieveSourceProfileEvidence({ source, maxSnippets: 6 })
    const hasContent =
      Boolean(source.thesis?.trim()) ||
      Boolean(source.summary?.trim()) ||
      (source.conclusions?.length ?? 0) > 0 ||
      snippets.length > 0

    if (!hasContent) {
      return {
        sourceId: source.sourceId,
        sourceTitle: source.title,
        answerability: 'NOT_RELEVANT',
        answer: null,
        keyEvidence: [],
        uncertainty: 'No analyzable content for comparison.',
        confidence: 0,
      }
    }

    return {
      sourceId: source.sourceId,
      sourceTitle: source.title,
      answerability: 'CONTEXT_ONLY',
      answer: buildSourcePerspective(source),
      keyEvidence: snippets.map((s) => ({
        text: s.text,
        startTime: s.startTime ?? null,
        endTime: s.endTime ?? null,
      })),
      uncertainty: null,
      confidence: 0.85,
    }
  })
}
