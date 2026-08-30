import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import type {
  CrossSourceInsight,
  CrossSourceRelation,
  CrossSourceSynthesisPayload,
  DirectInsight,
  DirectSourceAnswer,
} from '@/lib/direct-synthesis/types'
import { z } from 'zod'

const FinalAnswerSchema = z.object({ directAnswer: z.string() })

/** Deterministic fallback when no validated cross-source structures remain. */
export function buildFinalDirectAnswer(input: {
  centralQuestion: string
  sourceAnswers: DirectSourceAnswer[]
  agreements: CrossSourceRelation[]
  disagreements: CrossSourceRelation[]
  complementaryViews: CrossSourceRelation[]
  uniqueViews: CrossSourceRelation[]
  insights: DirectInsight[]
  insight: CrossSourceInsight | null
  nonComparableSources: CrossSourceSynthesisPayload['nonComparableSources']
  uncertainty: string[]
}): string {
  const directSources = input.sourceAnswers.filter(
    (a) => a.answerability === 'DIRECT' || a.answerability === 'PARTIAL',
  )

  if (directSources.length === 0) {
    return input.uncertainty[0] ??
      '제공된 영상만으로는 이 질문에 신뢰할 수 있는 결론을 내리기 어렵습니다.'
  }

  const parts: string[] = []

  if (input.agreements.length > 0) {
    parts.push(`공통점: ${input.agreements.map((a) => a.statement).join('; ')}`)
  }
  if (input.disagreements.length > 0) {
    parts.push(`차이: ${input.disagreements.map((d) => d.statement).join('; ')}`)
  }
  if (input.complementaryViews.length > 0) {
    parts.push(
      `보완 관점: ${input.complementaryViews.map((c) => c.statement).join('; ')}`,
    )
  }
  if (input.uniqueViews.length > 0) {
    parts.push(`독립 관점: ${input.uniqueViews.map((u) => u.statement).join('; ')}`)
  }
  if (input.insights.length > 0) {
    parts.push(`통찰: ${input.insights.map((i) => i.title).join('; ')}`)
  }
  if (input.insight) {
    parts.push(`통찰: ${input.insight.statement}`)
  }

  const primaryAnswer = directSources.find((s) => s.answer)?.answer
  if (parts.length > 0 && primaryAnswer) {
    return `${primaryAnswer} ${parts.join(' ')}`.trim()
  }

  if (parts.length > 0) {
    return parts.join(' ').trim()
  }

  const sourceLines = directSources
    .map((s) => `${s.sourceTitle}: ${s.answer ?? '—'}`)
    .join(' ')

  return `${sourceLines}${input.uncertainty.length ? ` 불확실성: ${input.uncertainty.join('; ')}` : ''}`.trim()
}

export async function finalizeValidatedDirectAnswer(input: {
  centralQuestion: string
  sourceAnswers: DirectSourceAnswer[]
  agreements: CrossSourceRelation[]
  disagreements: CrossSourceRelation[]
  complementaryViews: CrossSourceRelation[]
  uniqueViews: CrossSourceRelation[]
  insights: DirectInsight[]
  insight: CrossSourceInsight | null
  nonComparableSources: CrossSourceSynthesisPayload['nonComparableSources']
  uncertainty: string[]
  outputLanguage?: 'ko' | 'en'
}): Promise<string> {
  const hasValidatedStructures =
    input.agreements.length > 0 ||
    input.disagreements.length > 0 ||
    input.complementaryViews.length > 0 ||
    input.uniqueViews.length > 0 ||
    input.insights.length > 0 ||
    input.insight != null

  if (!hasValidatedStructures) {
    return buildFinalDirectAnswer(input)
  }

  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage ?? 'en')

  const payload = {
    centralQuestion: input.centralQuestion,
    sourceAnswers: input.sourceAnswers.map((a) => ({
      sourceId: a.sourceId,
      sourceTitle: a.sourceTitle,
      answerability: a.answerability,
      answer: a.answer,
      keyEvidence: a.keyEvidence,
    })),
    validatedAgreements: input.agreements,
    validatedDisagreements: input.disagreements,
    validatedComplementary: input.complementaryViews,
    validatedUnique: input.uniqueViews,
    validatedInsights: input.insights,
    validatedInsight: input.insight,
    nonComparableSources: input.nonComparableSources,
    uncertainty: input.uncertainty,
  }

  const parsed = await callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}

Write the final direct answer to the central question using ONLY the validated inputs below.

Rules:
- Do NOT claim agreement unless it appears in validatedAgreements.
- Do NOT claim disagreement unless it appears in validatedDisagreements.
- Do NOT claim complementary links unless in validatedComplementary.
- Do NOT claim unique perspectives unless in validatedUnique.
- Do NOT claim cross-source insight unless validatedInsights is non-empty or validatedInsight is non-null.
- Do NOT write per-video summaries ("Video 1 says...").
- Answer the central question as a synthesized judgment.
- If evidence is insufficient, say so honestly.`,
    user: JSON.stringify(payload, null, 2),
    schema: FinalAnswerSchema,
    schemaName: 'direct_validated_final_answer',
    maxOutputTokens: 2000,
  })

  return parsed.directAnswer
}
