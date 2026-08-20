import { getAIProvider } from '@/lib/ai/openai'
import { assertSynthesisCoverage } from '@/lib/synthesis/coverage'
import { synthesisLog } from '@/lib/synthesis/logger'
import { retrieveEvidenceForQuestion } from '@/lib/retrieval/evidence-retriever'
import type { AskAnswer, SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis } from '@/lib/types/source'

export type AskQuestionInput = {
  question: string
  synthesis: SynthesisResult
  sources: SourceAnalysis[]
  scope?: { type: string; label: string; context: string }
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export async function askAcrossSources(input: AskQuestionInput): Promise<AskAnswer> {
  const requiredIds = input.sources.map((s) => s.sourceId)
  const scopedQuestion = input.scope
    ? `[Scope: ${input.scope.type} — ${input.scope.label}]\nContext:\n${input.scope.context}\n\nQuestion: ${input.question}`
    : input.question

  const relevantChunks = await retrieveEvidenceForQuestion(scopedQuestion, input.sources)

  const ai = getAIProvider()
  let answer = await ai.answerAcrossSources({
    question: scopedQuestion,
    synthesis: input.synthesis,
    sources: input.sources,
    relevantChunks,
    outputLanguage: input.outputLanguage,
  })

  let coverage = assertSynthesisCoverage(requiredIds, answer.usedSourceIds)
  if (!coverage.ok) {
    synthesisLog('ask-retry', { missingSources: coverage.missingSourceIds.length })
    answer = await ai.answerAcrossSources({
      question: scopedQuestion,
      synthesis: input.synthesis,
      sources: input.sources,
      relevantChunks,
      missingSourceIds: coverage.missingSourceIds,
      outputLanguage: input.outputLanguage,
    })
    coverage = assertSynthesisCoverage(requiredIds, answer.usedSourceIds)
  }

  synthesisLog('ask-complete', {
    inputSources: requiredIds.length,
    usedSources: answer.usedSourceIds.length,
    missingSources: coverage.ok ? 0 : coverage.missingSourceIds.length,
    chunkSources: relevantChunks.length,
  })

  return answer
}
