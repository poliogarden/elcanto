import type { ComplexityAudit } from '@/lib/experiments/architecture-ab/types'

export function auditComplexity(): {
  architectureA: ComplexityAudit
  architectureB: ComplexityAudit
} {
  return {
    architectureA: {
      pipelineStages: 12,
      reasoningModules: 45,
      llmCallsTypical3Source: 8,
      heuristicGates: 18,
      failureStates: [
        'extraction',
        'relevance',
        'alignment',
        'participation',
        'candidate',
        'comparability',
        'verification',
        'consolidation',
        'judgment',
      ],
    },
    architectureB: {
      pipelineStages: 4,
      reasoningModules: 6,
      llmCallsTypical3Source: 4,
      heuristicGates: 1,
      failureStates: [
        'evidence_retrieval',
        'source_answer',
        'cross_source_synthesis',
        'evidence_validation',
      ],
    },
  }
}
