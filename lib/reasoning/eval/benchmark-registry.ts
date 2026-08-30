import type { SourceAnalysis } from '@/lib/types/source'
import { CLEAR_AGREEMENT_SOURCES } from '@/lib/reasoning/eval/benchmark-data/clear-agreement'
import { CLEAR_DIVIDE_SOURCES } from '@/lib/reasoning/eval/benchmark-data/clear-divide'
import { SAME_TOPIC_DIFFERENT_CLAIMS_SOURCES } from '@/lib/reasoning/eval/benchmark-data/same-topic-different-claims'
import { MIXED_IRRELEVANT_SOURCES } from '@/lib/reasoning/eval/benchmark-data/mixed-irrelevant'
import { QUESTION_MISMATCH_SOURCES } from '@/lib/reasoning/eval/benchmark-data/question-mismatch'
import { BLIND_COMPLEMENTARY_WILDFIRE_SOURCES } from '@/lib/reasoning/eval/blind-data/complementary'

export const BENCHMARK_DATA_KEYS = [
  'clear-agreement',
  'clear-divide',
  'same-topic-different-claims',
  'mixed-irrelevant',
  'question-mismatch',
  'complementary-wildfire',
] as const

export type BenchmarkDataKey = (typeof BENCHMARK_DATA_KEYS)[number]

export function loadBenchmarkSources(key: BenchmarkDataKey): SourceAnalysis[] {
  switch (key) {
    case 'clear-agreement':
      return CLEAR_AGREEMENT_SOURCES
    case 'clear-divide':
      return CLEAR_DIVIDE_SOURCES
    case 'same-topic-different-claims':
      return SAME_TOPIC_DIFFERENT_CLAIMS_SOURCES
    case 'mixed-irrelevant':
      return MIXED_IRRELEVANT_SOURCES
    case 'question-mismatch':
      return QUESTION_MISMATCH_SOURCES
    case 'complementary-wildfire':
      return BLIND_COMPLEMENTARY_WILDFIRE_SOURCES
    default:
      throw new Error(`Unknown benchmark data key: ${key}`)
  }
}

export function isBenchmarkFixture(fixtureId: string): boolean {
  return BENCHMARK_DATA_KEYS.includes(fixtureId as BenchmarkDataKey)
}
