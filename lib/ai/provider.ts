import type { AskAnswer, SynthesisResult } from '@/lib/types/analysis'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { RelationshipGraph } from '@/lib/types/relationship'
import type { Source, SourceAnalysis, SourceFailure } from '@/lib/types/source'
import type { SynthesisMode } from '@/lib/types/synthesis-mode'

export type TranscriptChunk = {
  start: number
  text: string
}

export type AnalyzeSourceInput = {
  source: Source
  transcript: TranscriptChunk[]
  operation?: 'VIDEO_ANALYSIS' | 'VIDEO_DEEP_ANALYSIS'
}

export type DiscoverRelationshipsInput = {
  sources: SourceAnalysis[]
}

export type RunSynthesisInput = {
  question?: string
  sources: SourceAnalysis[]
  graph: RelationshipGraph
  setAnalysis?: SetAnalysis
  failedSources?: SourceFailure[]
  missingSourceIds?: string[]
  mode?: SynthesisMode
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export type RunCombinedSynthesisInput = {
  question?: string
  sources: SourceAnalysis[]
  failedSources?: SourceFailure[]
  missingSourceIds?: string[]
  mode?: SynthesisMode
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export type CombinedSynthesisLLMResult = {
  graph: RelationshipGraph
  sources: import('@/lib/types/relationship').SourceReasoning[]
  patterns: import('@/lib/types/relationship').CrossSourcePattern[]
  synthesis: import('@/lib/types/relationship').SynthesisConclusion
  insights: import('@/lib/types/relationship').Insight[]
}

export type RunKnowledgeExtensionInput = {
  sources: SourceAnalysis[]
  setAnalysis: SetAnalysis
  synthesis: SynthesisResult
}

export type ScopedAskInput = AnswerAcrossSourcesInput & {
  scope?: {
    type: 'intersection' | 'difference' | 'contradiction' | 'claim' | 'cluster' | 'gap'
    id: string
    label: string
    context: string
  }
}

/** @deprecated use RunSynthesisInput */
export type SynthesizeSourcesInput = {
  question?: string
  sources: SourceAnalysis[]
  failedSources?: SourceFailure[]
  missingSourceIds?: string[]
}

export type AnswerAcrossSourcesInput = {
  question: string
  synthesis: SynthesisResult
  sources: SourceAnalysis[]
  relevantChunks: Array<{ sourceId: string; videoId: string; chunks: TranscriptChunk[] }>
  missingSourceIds?: string[]
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export type RunFourthIdeaInput = {
  sources: SourceAnalysis[]
  graph: RelationshipGraph
  setAnalysis: SetAnalysis
  synthesis: import('@/lib/types/relationship').SynthesisConclusion
  patterns: import('@/lib/types/relationship').CrossSourcePattern[]
  insights: import('@/lib/types/relationship').Insight[]
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export interface AIProvider {
  analyzeSource(input: AnalyzeSourceInput): Promise<SourceAnalysis>
  discoverRelationships(input: DiscoverRelationshipsInput): Promise<RelationshipGraph>
  runSynthesis(input: RunSynthesisInput): Promise<SynthesisResult>
  runCombinedSynthesis(input: RunCombinedSynthesisInput): Promise<CombinedSynthesisLLMResult>
  runFourthIdea(input: RunFourthIdeaInput): Promise<import('@/lib/types/fourth-idea').FourthIdea | null>
  runKnowledgeExtension(input: RunKnowledgeExtensionInput): Promise<import('@/lib/types/knowledge').KnowledgeExtension>
  answerAcrossSources(input: AnswerAcrossSourcesInput): Promise<AskAnswer>
}
