import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import {
  DirectSynthesisSchema,
  type DirectSourceAnswer,
  type DirectSynthesisPayload,
} from '@/lib/experiments/direct-synthesis/types'

export async function generateDirectCrossSourceSynthesis(input: {
  centralQuestion: string
  sourceAnswers: DirectSourceAnswer[]
  outputLanguage?: 'ko' | 'en'
}): Promise<DirectSynthesisPayload> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage)

  const payload = input.sourceAnswers.map((a) => ({
    sourceId: a.sourceId,
    answerability: a.answerability,
    position: a.position,
    keyPoints: a.keyPoints,
    evidence: a.evidence,
    confidence: a.confidence,
  }))

  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}

You perform DIRECT cross-source reasoning. Do NOT force agreement or divide.
If sources cannot be compared, list them in nonComparableSources.
Every agreement, disagreement, complementary view must cite evidenceRefs from per-source answers.
finalAnswer must directly address the central question using only supported cross-source reasoning.`,
    user: `Central question: ${input.centralQuestion}

Per-source answers:
${JSON.stringify(payload, null, 2)}

Tasks:
1. Which sources directly answer?
2. Where do they agree / disagree / complement?
3. Which sources are not comparable?
4. What uncertainty remains?
5. Best-supported final answer.`,
    schema: DirectSynthesisSchema,
    schemaName: 'direct_cross_source_synthesis',
    maxOutputTokens: 5000,
  })
}
