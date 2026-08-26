import { describe, expect, it } from 'vitest'
import { assessClaimAlignment } from '@/lib/reasoning/alignment'
import { filterHighSignalClaims, ingestSourceUnderstanding } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'

const baseSource = (id: string, title: string, topics: string[]): SourceAnalysis => ({
  sourceId: id,
  videoId: id,
  voiceIndex: Number(id.replace('source_', '')),
  title,
  summary: '',
  thesis: '',
  topics,
  claims: [
    {
      id: `${id}_claim_1`,
      sourceId: id,
      statement: 'MCP reduces integration complexity between AI tools.',
      topic: 'MCP',
      confidence: 0.9,
    },
  ],
  entities: [],
  conclusions: [],
  implications: [],
  evidence: [{ id: `${id}_ev_1`, timestamp: 10, text: 'MCP simplifies integrations.' }],
  stance: 'supportive',
})

describe('assessClaimAlignment', () => {
  const claimA: ReasoningClaim = {
    id: 'a',
    sourceId: 'source_1',
    videoId: 'v1',
    voiceIndex: 1,
    statement: 'MCP reduces integration complexity between AI tools.',
    normalizedStatement: 'mcp reduces integration complexity between ai tools.',
    evidenceIds: [],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: ['concept_1'],
  }
  const claimB: ReasoningClaim = {
    id: 'b',
    sourceId: 'source_2',
    videoId: 'v2',
    voiceIndex: 2,
    statement: 'AI automation will transform all knowledge work within five years.',
    normalizedStatement: 'ai automation will transform all knowledge work within five years.',
    evidenceIds: [],
    claimType: 'predictive',
    confidence: 'strong',
    conceptIds: ['concept_2'],
  }

  it('rejects unrelated high-level claims (TEST F)', () => {
    const result = assessClaimAlignment(claimA, claimB)
    expect(result.comparable).toBe(false)
  })
})

describe('ingestSourceUnderstanding', () => {
  it('links claims to evidence and concepts', () => {
    const ingested = ingestSourceUnderstanding([
      baseSource('source_1', 'MCP intro', ['MCP', 'integration']),
    ])
    expect(ingested.claims.length).toBeGreaterThan(0)
    expect(ingested.concepts.length).toBeGreaterThan(0)
    expect(ingested.evidence.length).toBe(1)
  })
})

describe('filterHighSignalClaims', () => {
  it('drops weak and topic-only claims', () => {
    const filtered = filterHighSignalClaims([
      {
        id: '1',
        sourceId: 's1',
        videoId: 'v1',
        voiceIndex: 1,
        statement: 'MCP',
        normalizedStatement: 'mcp',
        evidenceIds: [],
        claimType: 'descriptive',
        confidence: 'strong',
        conceptIds: [],
      },
      {
        id: '2',
        sourceId: 's1',
        videoId: 'v1',
        voiceIndex: 1,
        statement: 'MCP reduces integration complexity between AI tools.',
        normalizedStatement: 'mcp reduces integration complexity between ai tools.',
        evidenceIds: [],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: [],
      },
    ])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
  })
})
