import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const DeepInsightSchema = z.object({
  insight: z.string(),
  whyItMatters: z.string(),
  supportingReasoning: z.string(),
})

const ClaimSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  statement: z.string(),
  topic: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().nullable(),
  evidenceSummary: z.string().nullable(),
})

const SourceAnalysisSchema = z.object({
  sourceId: z.string(),
  videoId: z.string(),
  voiceIndex: z.number(),
  title: z.string(),
  summary: z.string(),
  thesis: z.string(),
  topics: z.array(z.string()),
  claims: z.array(ClaimSchema),
  entities: z.array(
    z.object({ id: z.string(), name: z.string(), type: z.string() }),
  ),
  conclusions: z.array(z.string()),
  mainClaims: z.array(z.string()),
  keyFacts: z.array(z.string()),
  keyPeople: z.array(z.string()),
  keyTopics: z.array(z.string()),
  arguments: z.array(z.string()),
  evidence: z.array(
    z.object({ id: z.string(), timestamp: z.number(), text: z.string() }),
  ),
  implications: z.array(z.string()),
  stance: z.string().nullable(),
  centralQuestion: z.string().nullable(),
  assumptions: z.array(z.string()).nullable(),
  counterArguments: z.array(z.string()).nullable(),
  limitations: z.array(z.string()).nullable(),
  keyArguments: z.array(z.string()).nullable(),
  importantConcepts: z.array(z.string()).nullable(),
  uniquePerspective: z.string().nullable(),
  deepInsights: z.array(DeepInsightSchema).nullable(),
})

describe('OpenAI structured schemas', () => {
  it('SourceAnalysisSchema is compatible with zodResponseFormat (nullable, not optional)', () => {
    expect(() => zodResponseFormat(SourceAnalysisSchema, 'source_analysis')).not.toThrow()
  })
})
