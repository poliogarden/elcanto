export type BenchmarkRelationshipType = 'AGREEMENT' | 'DIVIDE' | 'COMPLEMENTARY'

export type BenchmarkGoldRelationship = {
  type: BenchmarkRelationshipType
  sources: [string, string]
  fromClaimPattern: string
  toClaimPattern: string
  normalizedProposition: string
  required: boolean
}

export type BenchmarkForbiddenRelationship = {
  type: BenchmarkRelationshipType
  sources?: [string, string]
  fromClaimPattern?: string
  toClaimPattern?: string
  reason: string
}

export type ExpectedSourceParticipation = {
  sourceId: string
  participateInGeneration: boolean
}

export type BenchmarkGoldExpectations = {
  fixtureId: string
  label: string
  category: 'regression' | 'benchmark'
  expectedRelationships: BenchmarkGoldRelationship[]
  forbiddenRelationships?: BenchmarkForbiddenRelationship[]
  expectedSourceParticipation?: ExpectedSourceParticipation[]
  maxAgreement?: number
  maxDivide?: number
  maxComplementary?: number
  minAgreement?: number
  minDivide?: number
  requireEvidenceIntegrity: boolean
  requireDefensibleJudgment?: boolean
  allowMissingJudgment?: boolean
  minPrecision?: number
  criticalRecall?: number
  /** Zero verified relationships is valid when no gold relationships are required. */
  allowZeroRelationships?: boolean
}

const CLEAR_AGREEMENT_GOLD: BenchmarkGoldExpectations = {
  fixtureId: 'clear-agreement',
  label: 'Clear Agreement',
  category: 'benchmark',
  expectedRelationships: [
    {
      type: 'AGREEMENT',
      sources: ['source_1', 'source_2'],
      fromClaimPattern: 'reduces the amount of time employees spend commuting',
      toClaimPattern: 'cuts much of the daily travel',
      normalizedProposition: 'remote work reduces employee commuting or daily workplace travel',
      required: true,
    },
  ],
  forbiddenRelationships: [
    {
      type: 'AGREEMENT',
      sources: ['source_1', 'source_3'],
      fromClaimPattern: 'commuting',
      toClaimPattern: 'collaboration tools',
      reason: 'implementation cost is a different dimension from commuting time',
    },
  ],
  expectedSourceParticipation: [
    { sourceId: 'source_1', participateInGeneration: true },
    { sourceId: 'source_2', participateInGeneration: true },
    { sourceId: 'source_3', participateInGeneration: false },
  ],
  minAgreement: 1,
  maxDivide: 0,
  requireEvidenceIntegrity: true,
  requireDefensibleJudgment: true,
  minPrecision: 0.9,
  criticalRecall: 1,
}

const CLEAR_DIVIDE_GOLD: BenchmarkGoldExpectations = {
  fixtureId: 'clear-divide',
  label: 'Clear Divide',
  category: 'benchmark',
  expectedRelationships: [
    {
      type: 'DIVIDE',
      sources: ['source_1', 'source_2'],
      fromClaimPattern: 'increases employee productivity',
      toClaimPattern: 'decreases employee productivity',
      normalizedProposition: 'remote work affects employee productivity',
      required: true,
    },
  ],
  forbiddenRelationships: [
    {
      type: 'AGREEMENT',
      sources: ['source_1', 'source_2'],
      reason: 'opposing productivity positions must not collapse to agreement',
    },
  ],
  expectedSourceParticipation: [
    { sourceId: 'source_1', participateInGeneration: true },
    { sourceId: 'source_2', participateInGeneration: true },
  ],
  minDivide: 1,
  maxAgreement: 0,
  requireEvidenceIntegrity: true,
  requireDefensibleJudgment: true,
  minPrecision: 0.9,
  criticalRecall: 1,
}

const SAME_TOPIC_GOLD: BenchmarkGoldExpectations = {
  fixtureId: 'same-topic-different-claims',
  label: 'Same Topic Different Claims',
  category: 'benchmark',
  expectedRelationships: [],
  maxAgreement: 0,
  maxDivide: 0,
  maxComplementary: 0,
  requireEvidenceIntegrity: true,
  allowMissingJudgment: true,
  allowZeroRelationships: true,
  minPrecision: 1,
  criticalRecall: 1,
}

const MIXED_IRRELEVANT_GOLD: BenchmarkGoldExpectations = {
  fixtureId: 'mixed-irrelevant',
  label: 'Mixed Irrelevant',
  category: 'benchmark',
  expectedRelationships: [
    {
      type: 'AGREEMENT',
      sources: ['source_1', 'source_2'],
      fromClaimPattern: 'R-value of at least R-49',
      toClaimPattern: 'R-49 to R-60',
      normalizedProposition: 'cold-climate attic retrofits target high R-value insulation',
      required: true,
    },
  ],
  expectedSourceParticipation: [
    { sourceId: 'source_1', participateInGeneration: true },
    { sourceId: 'source_2', participateInGeneration: true },
    { sourceId: 'source_3', participateInGeneration: false },
    { sourceId: 'source_4', participateInGeneration: false },
    { sourceId: 'source_5', participateInGeneration: false },
  ],
  requireEvidenceIntegrity: true,
  requireDefensibleJudgment: true,
  minPrecision: 0.9,
  criticalRecall: 1,
}

const MCP_BASELINE_GOLD: BenchmarkGoldExpectations = {
  fixtureId: 'mcp-3video-baseline',
  label: 'MCP Baseline',
  category: 'regression',
  expectedRelationships: [],
  requireEvidenceIntegrity: true,
  requireDefensibleJudgment: true,
  allowZeroRelationships: true,
  minPrecision: 0.9,
  criticalRecall: 0,
}

export const BENCHMARK_GOLD_BY_ID: Record<string, BenchmarkGoldExpectations> = {
  'clear-agreement': CLEAR_AGREEMENT_GOLD,
  'clear-divide': CLEAR_DIVIDE_GOLD,
  'same-topic-different-claims': SAME_TOPIC_GOLD,
  'mixed-irrelevant': MIXED_IRRELEVANT_GOLD,
  'mcp-3video-baseline': MCP_BASELINE_GOLD,
}

export const SUITE_FIXTURE_ORDER = [
  'mcp-3video-baseline',
  'clear-agreement',
  'clear-divide',
  'same-topic-different-claims',
  'mixed-irrelevant',
] as const

export function getBenchmarkGold(fixtureId: string): BenchmarkGoldExpectations | null {
  return BENCHMARK_GOLD_BY_ID[fixtureId] ?? null
}

export function requiredGoldRelationships(gold: BenchmarkGoldExpectations): BenchmarkGoldRelationship[] {
  return gold.expectedRelationships.filter((r) => r.required)
}
