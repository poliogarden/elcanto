import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import { DEEP_SYNTHESIS_INSTRUCTION } from '@/lib/direct-synthesis/deep-synthesis-instruction'
import type { FormattedSourceTranscript } from '@/lib/direct-synthesis/build-transcript-catalog'
import {
  DeepSynthesisSchema,
  type DeepSynthesisPayload,
} from '@/lib/direct-synthesis/types'
import type { QuestionMode } from '@/lib/direct-synthesis/question-mode'
import {
  detectSynthesisIntent,
  synthesisIntentPromptHint,
} from '@/lib/direct-synthesis/question-mode'

export async function synthesizeDeepCrossSource(input: {
  centralQuestion: string
  questionMode?: QuestionMode
  formattedTranscripts: FormattedSourceTranscript[]
  outputLanguage?: 'ko' | 'en'
}): Promise<DeepSynthesisPayload> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage ?? 'en')
  const questionMode = input.questionMode ?? 'CONTENT_QUESTION'
  const intentHint =
    questionMode === 'SYNTHESIS_QUESTION'
      ? synthesisIntentPromptHint(detectSynthesisIntent(input.centralQuestion))
      : ''

  const transcriptBlock = input.formattedTranscripts
    .map((t) => t.text)
    .join('\n\n')

  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}

${DEEP_SYNTHESIS_INSTRUCTION}

${questionMode === 'SYNTHESIS_QUESTION' ? `This is a SYNTHESIS_QUESTION: the user asks for cross-source comparison, not per-video answers to the literal question text.
${intentHint}
` : ''}

Output structured JSON matching the schema.

candidateInsights: 0–4 when genuinely strong. Do not force count.
Each candidate must include sourceInteractions from at least two different sourceIds.

Each formatted transcript header includes sourceId — use that exact sourceId in sourceInteractions.

Transcripts may be in English or other languages. Write each proposition in the SAME language as that source's transcript text.

connectionConcepts and sourceConcepts are NOT part of this output.`,
    user: `Central question: ${input.centralQuestion}

Full source transcripts (with timestamps). Propositions must match transcript language (English transcripts → English propositions):
${transcriptBlock}`,
    schema: DeepSynthesisSchema,
    schemaName: 'deep_cross_source_synthesis',
    maxOutputTokens: 6000,
    contextObjectSize: transcriptBlock.length,
  })
}
