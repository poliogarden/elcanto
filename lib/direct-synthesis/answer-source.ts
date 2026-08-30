import { z } from 'zod'
import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import {
  formatEvidenceForPrompt,
  retrieveQuestionFocusedEvidence,
  type EvidenceSnippet,
} from '@/lib/direct-synthesis/evidence'
import { wireKeyEvidenceFromSnippets } from '@/lib/direct-synthesis/wire-key-evidence'
import { DirectSourceAnswerSchema, type DirectSourceAnswer } from '@/lib/direct-synthesis/types'
import type { SourceAnalysis } from '@/lib/types/source'

const PerSourceSchema = z.object({ answer: DirectSourceAnswerSchema })

export async function answerSourceForQuestion(input: {
  centralQuestion: string
  source: SourceAnalysis
  evidenceSnippets: EvidenceSnippet[]
  outputLanguage?: 'ko' | 'en'
}): Promise<DirectSourceAnswer> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage ?? 'en')

  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'VIDEO_ANALYSIS',
    system: `${lang}

You answer ONE central question about ONE video. Do not summarize the whole video.
If the video does not address the question, set answerability CONTEXT_ONLY or NOT_RELEVANT and answer null.
Do not invent connections between unrelated topics (e.g. marketing vs decision accuracy).
Use ONLY the evidence snippets provided. Copy timestamps only when present in snippets.`,
    user: `Central question: ${input.centralQuestion}

Source: ${input.source.title} (${input.source.sourceId})

Evidence snippets:
${formatEvidenceForPrompt(input.evidenceSnippets)}

Return structured answer with sourceId=${input.source.sourceId} and sourceTitle=${JSON.stringify(input.source.title)}.`,
    schema: PerSourceSchema,
    schemaName: 'direct_per_source_answer',
    maxOutputTokens: 2000,
    youtubeVideoId: input.source.videoId,
  })

  const keyEvidence = wireKeyEvidenceFromSnippets(
    parsed.answer.keyEvidence,
    input.evidenceSnippets,
  )

  return {
    ...parsed.answer,
    sourceId: input.source.sourceId,
    sourceTitle: input.source.title,
    keyEvidence: keyEvidence.map((e) => ({
      text: e.text,
      startTime: e.startTime ?? undefined,
      endTime: e.endTime ?? undefined,
    })),
  }
}

export function prepareSourceEvidence(input: {
  centralQuestion: string
  source: SourceAnalysis
}): EvidenceSnippet[] {
  return retrieveQuestionFocusedEvidence({
    centralQuestion: input.centralQuestion,
    source: input.source,
  })
}
