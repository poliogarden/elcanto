import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import {
  DirectSourceAnswerSchema,
  type DirectSourceAnswer,
} from '@/lib/experiments/direct-synthesis/types'
import {
  formatEvidenceForPrompt,
  retrieveQuestionFocusedEvidence,
} from '@/lib/experiments/direct-synthesis/evidence-retrieval'
import type { SourceAnalysis } from '@/lib/types/source'
import { z } from 'zod'

const PerSourceSchema = z.object({ answer: DirectSourceAnswerSchema })

export async function generateDirectSourceAnswer(input: {
  centralQuestion: string
  source: SourceAnalysis
  outputLanguage?: 'ko' | 'en'
}): Promise<DirectSourceAnswer> {
  const evidence = retrieveQuestionFocusedEvidence({
    centralQuestion: input.centralQuestion,
    source: input.source,
  })

  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage)

  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'VIDEO_ANALYSIS',
    system: `${lang}

You answer ONE question about ONE video source. Do not summarize the whole video.
Focus: what does this source say about the central question?
Use ONLY provided evidence snippets. Reference evidence by evidenceRef id.
If the source does not address the question, set answerability NOT_RELEVANT and position null.`,
    user: `Central question: ${input.centralQuestion}

Source: ${input.source.title} (${input.source.sourceId})
Channel: ${input.source.channel}

Evidence snippets:
${formatEvidenceForPrompt(evidence)}

Return structured answer for sourceId=${input.source.sourceId}.`,
    schema: PerSourceSchema,
    schemaName: 'direct_source_answer',
    maxOutputTokens: 2000,
    youtubeVideoId: input.source.videoId,
  })

  return {
    ...parsed.answer,
    sourceId: input.source.sourceId,
    evidence: parsed.answer.evidence.map((e) => ({
      evidenceRef: e.evidenceRef,
      text: e.text,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
  }
}
