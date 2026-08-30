import {
  retrieveQuestionFocusedEvidence,
  retrieveSourceProfileEvidence,
} from '@/lib/direct-synthesis/evidence'
import type { DirectSourceAnswer } from '@/lib/direct-synthesis/types'
import type { QuestionMode } from '@/lib/direct-synthesis/question-mode'
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
 * Build per-source profile inputs without per-source LLM.
 * Used for UI/compare metadata — not as Deep Synthesis input.
 */
export function buildProfileSourceAnswers(input: {
  sources: SourceAnalysis[]
  centralQuestion: string
  questionMode: QuestionMode
}): DirectSourceAnswer[] {
  return input.sources.map((source) => {
    const snippets =
      input.questionMode === 'CONTENT_QUESTION'
        ? retrieveQuestionFocusedEvidence({
            centralQuestion: input.centralQuestion,
            source,
            maxSnippets: 8,
          })
        : retrieveSourceProfileEvidence({ source, maxSnippets: 6 })

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
