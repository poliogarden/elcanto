import { z } from 'zod'

const confidence = z.enum(['strong', 'moderate', 'weak'])
const relType = z.enum([
  'AGREEMENT',
  'CONTRADICTION',
  'TENSION',
  'COMPLEMENTARY',
  'CAUSE_EFFECT',
  'DEPENDENCY',
  'SAME_TOPIC_DIFFERENT_PERSPECTIVE',
  'PARTIAL_AGREEMENT',
  'INDEPENDENT',
  'PROBLEM_SOLUTION',
  'MECHANISM_OUTCOME',
  'TRADE_OFF',
  'PREREQUISITE',
  'CONSTRAINT',
  'ADOPTION_BARRIER',
  'ENABLER',
  'EXAMPLE_OF',
  'GENERALIZATION',
  'SPECIALIZATION',
  'TEMPORAL_PROGRESSION',
])

const discoveryLevel = z.enum([
  'DIRECT_MATCH',
  'SEMANTIC_RELATIONSHIP',
  'CROSS_SOURCE_INFERENCE',
])

export const ClusteringSchema = z.object({
  centralQuestion: z.string(),
  clusters: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      centralQuestion: z.string(),
      sourceIds: z.array(z.string()),
      relevance: z.enum(['primary', 'secondary', 'off_topic']),
    }),
  ),
  sourceRelevance: z.array(
    z.object({
      sourceId: z.string(),
      classification: z.enum([
        'direct',
        'supporting',
        'contrasting',
        'contextual',
        'weak',
        'off_topic',
      ]),
      score: z.number().min(0).max(1),
      reason: z.string(),
      relevantClaimIds: z.array(z.string()),
    }),
  ),
  excluded: z.array(
    z.object({
      sourceId: z.string(),
      reason: z.string(),
    }),
  ),
})

export const RelationshipCandidatesSchema = z.object({
  candidates: z.array(
    z.object({
      fromClaimId: z.string(),
      toClaimId: z.string(),
      type: relType,
      rationale: z.string(),
      confidence: confidence,
      discoveryLevel: discoveryLevel.nullable(),
      dimension: z.string().nullable(),
    }),
  ),
})

export const RelationshipVerificationSchema = z.object({
  verified: z.array(
    z.object({
      fromClaimId: z.string(),
      toClaimId: z.string(),
      type: relType,
      explanation: z.string(),
      confidence: confidence,
      discoveryLevel: discoveryLevel.nullable(),
      dimension: z.string().nullable(),
      reasoningBridge: z.string().nullable(),
    }),
  ),
  rejected: z.array(
    z.object({
      fromClaimId: z.string(),
      toClaimId: z.string(),
      proposedType: relType,
      reason: z.string(),
      rejectionReason: z
        .enum([
          'TOPIC_ONLY',
          'INSUFFICIENT_EVIDENCE',
          'DIFFERENT_DIMENSION',
          'LOGICAL_GAP',
          'SAME_SOURCE_ONLY',
          'DUPLICATE',
          'LOW_RELEVANCE',
          'UNSUPPORTED_INFERENCE',
          'ALIGNMENT_FAILED',
          'WEAK_CONFIDENCE',
          'KEYWORD_ONLY',
        ])
        .nullable(),
    }),
  ),
})

export const PatternDiscoverySchema = z.object({
  patterns: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'recurring_driver',
        'shared_causal_mechanism',
        'trade_off',
        'polarization',
        'dependency',
        'adoption_barrier',
        'missing_variable',
        'temporal_shift',
        'different_definition',
        'different_evaluation_criterion',
      ]),
      title: z.string(),
      description: z.string(),
      relationshipIds: z.array(z.string()),
      claimIds: z.array(z.string()),
      confidence: confidence,
    }),
  ),
  noPatterns: z.boolean(),
})

export const SynthesisJudgmentSchema = z.object({
  synthesis: z.object({
    statement: z.string(),
    explanation: z.string(),
    patternIds: z.array(z.string()),
    confidence: confidence,
  }),
  judgment: z.object({
    statement: z.string(),
    whatIsSupported: z.string(),
    whatIsUncertain: z.string(),
    keyReason: z.string(),
    confidence: z.enum(['high', 'moderate', 'low']),
    missingEvidence: z.array(z.string()).max(3),
  }),
  landscape: z.object({
    agree: z.object({
      countLabel: z.string(),
      cards: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })),
    }),
    divide: z.object({
      countLabel: z.string(),
      cards: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })),
    }),
    unclear: z.object({
      countLabel: z.string(),
      cards: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })),
    }),
  }),
  knowledgeGaps: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        whyItMatters: z.string(),
        linkedJudgmentAspect: z.string(),
      }),
    )
    .max(3),
  noSynthesis: z.boolean(),
})

export const EmergentInsightsSchema = z.object({
  insights: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          'combined_implication',
          'latent_tradeoff',
          'hidden_assumption',
          'new_hypothesis',
          'decision_rule',
          'future_implication',
        ]),
        statement: z.string(),
        explanation: z.string(),
        evidencePath: z.array(
          z.object({
            step: z.enum(['claim', 'relationship', 'pattern', 'inference']),
            refId: z.string(),
            label: z.string(),
          }),
        ),
        confidence: z.enum(['high', 'moderate', 'low']),
        reasoningBridge: z.string().nullable(),
        inferenceType: z.string().nullable(),
      }),
    )
    .max(2),
  noInsights: z.boolean(),
})

export const CriticSchema = z.object({
  synthesisVerdict: z.enum(['SUPPORTED', 'WEAK', 'REJECTED']),
  judgmentVerdict: z.enum(['SUPPORTED', 'WEAK', 'REJECTED']),
  insightVerdicts: z.array(
    z.object({
      insightId: z.string(),
      verdict: z.enum(['SUPPORTED', 'WEAK', 'REJECTED']),
      reason: z.string(),
    }),
  ),
  notes: z.array(z.string()).max(5),
})
