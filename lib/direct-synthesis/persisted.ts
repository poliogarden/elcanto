import type { DirectPipelineRun, DirectSynthesisResult } from '@/lib/direct-synthesis/types'
import type { DeepSynthesisDiagnostics } from '@/lib/direct-synthesis/types'

import type { QuestionMode } from '@/lib/direct-synthesis/question-mode'
import type { DirectInsight } from '@/lib/direct-synthesis/types'

export type DirectSynthesisPersisted = {
  version: string
  synthesisMode?: 'deep-direct'
  centralQuestion: string
  questionMode?: QuestionMode
  directAnswer: string
  sourceContributions: DirectSynthesisResult['sourceContributions']
  sourceAnswers: DirectSynthesisResult['sourceAnswers']
  agreements: DirectSynthesisResult['agreements']
  disagreements: DirectSynthesisResult['disagreements']
  complementaryViews: DirectSynthesisResult['complementaryViews']
  uniqueViews: DirectSynthesisResult['uniqueViews']
  insights?: DirectInsight[]
  insight: DirectSynthesisResult['insight']
  nonComparableSources: DirectSynthesisResult['nonComparableSources']
  uncertainty: string[]
  evidence: DirectSynthesisResult['evidence']
  removedUnsupported: DirectSynthesisResult['removedUnsupported']
  timingMs: DirectPipelineRun['timingMs']
  deepSynthesisDiagnostics?: DeepSynthesisDiagnostics
}

export function toPersistedDirectSynthesis(run: DirectPipelineRun): DirectSynthesisPersisted {
  return {
    version: run.version,
    synthesisMode: run.synthesisMode,
    centralQuestion: run.result.centralQuestion,
    questionMode: run.result.questionMode,
    directAnswer: run.result.directAnswer,
    sourceContributions: run.result.sourceContributions,
    sourceAnswers: run.result.sourceAnswers,
    agreements: run.result.agreements,
    disagreements: run.result.disagreements,
    complementaryViews: run.result.complementaryViews,
    uniqueViews: run.result.uniqueViews,
    insights: run.result.insights,
    insight: run.result.insight,
    nonComparableSources: run.result.nonComparableSources,
    uncertainty: run.result.uncertainty,
    evidence: run.result.evidence,
    removedUnsupported: run.result.removedUnsupported,
    timingMs: run.timingMs,
    deepSynthesisDiagnostics: run.deepSynthesisDiagnostics,
  }
}

export function isDirectSynthesisDocument(
  doc: { reasoningEngine?: string; directSynthesis?: DirectSynthesisPersisted },
): boolean {
  return doc.reasoningEngine === 'direct' || Boolean(doc.directSynthesis)
}
