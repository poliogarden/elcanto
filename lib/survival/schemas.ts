import { z } from 'zod'

const confidence = z.enum(['strong', 'moderate', 'weak'])
const relType = z.enum([
  'AGREEMENT',
  'PARTIAL_AGREEMENT',
  'COMPLEMENTARY',
  'DISAGREEMENT',
  'CONTRADICTION',
  'INDEPENDENT',
])

export const TopicCoherenceSchema = z.object({
  centralQuestion: z.string(),
  coherenceLevel: z.enum(['high', 'moderate', 'low']),
  assessments: z.array(
    z.object({
      sourceId: z.string(),
      relevance: z.enum(['on_topic', 'partial', 'off_topic']),
      reason: z.string(),
    }),
  ),
})

export const SurvivalClaimsSchema = z.object({
  claims: z.array(
    z.object({
      claimId: z.string(),
      sourceId: z.string(),
      claim: z.string(),
      evidence: z.string(),
      timestamp: z.number().nullable(),
      confidence: confidence,
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
    }),
  ),
  rejected: z.array(
    z.object({
      fromClaimId: z.string(),
      toClaimId: z.string(),
      proposedType: relType,
      reason: z.string(),
    }),
  ),
})

export const SurvivalSynthesisSchema = z.object({
  sourcePositions: z.array(
    z.object({
      sourceId: z.string(),
      position: z.string(),
    }),
  ),
  consensus: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        oneLineSummary: z.string(),
        supportingSourceIds: z.array(z.string()),
        confidence: confidence,
      }),
    )
    .max(3),
  disagreements: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        oneLineSummary: z.string(),
        sideA: z.object({
          label: z.string(),
          claimText: z.string(),
          claimId: z.string().nullable(),
          sourceIds: z.array(z.string()),
        }),
        sideB: z.object({
          label: z.string(),
          claimText: z.string(),
          claimId: z.string().nullable(),
          sourceIds: z.array(z.string()),
        }),
        confidence: confidence,
      }),
    )
    .max(3),
  uncertainClaims: z.array(
    z.object({
      claimId: z.string(),
      signal: z.enum(['needs_evidence', 'weakly_supported', 'contested', 'strongly_supported']),
      reason: z.string(),
    }),
  ),
  synthesis: z.object({
    headline: z.string(),
    explanation: z.string(),
    confidence: confidence,
    judgmentBasis: z.string().nullable(),
  }),
  emergentInsights: z
    .array(
      z.object({
        id: z.string(),
        statement: z.string(),
        reasoningPath: z.array(
          z.object({
            step: z.enum(['claim', 'relationship']),
            refId: z.string(),
            label: z.string(),
          }),
        ),
        confidence: confidence,
      }),
    )
    .max(2),
  noEmergentInsight: z.boolean(),
  knowledgeGaps: z
    .array(z.object({ id: z.string(), question: z.string() }))
    .max(3),
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
})

export const EmergentInsightsOnlySchema = z.object({
  emergentInsights: z
    .array(
      z.object({
        id: z.string(),
        statement: z.string(),
        reasoningPath: z.array(
          z.object({
            step: z.enum(['claim', 'relationship']),
            refId: z.string(),
            label: z.string(),
          }),
        ),
        confidence: confidence,
      }),
    )
    .max(2),
  noEmergentInsight: z.boolean(),
})

export const SurvivalAskSchema = z.object({
  answer: z.string(),
  supportedBySourceIds: z.array(z.string()),
  why: z.array(z.string()).max(3),
  evidenceRefs: z.array(
    z.object({
      claimId: z.string(),
      excerpt: z.string(),
    }),
  ),
})
