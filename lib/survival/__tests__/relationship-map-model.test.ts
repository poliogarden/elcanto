import { describe, expect, it } from 'vitest'
import { buildClaimLinkItems, extractMapTopics } from '@/lib/survival/relationship-map-model'
import type { SurvivalAnalysis } from '@/lib/survival/types'

const baseSurvival = (): SurvivalAnalysis => ({
  version: 'survival-v3',
  topicCoherence: {
    centralQuestion: 'Is MCP ready for production?',
    coherenceLevel: 'high',
    assessments: [],
  },
  sources: [
    {
      videoId: 'v1',
      sourceId: 's1',
      voiceIndex: 1,
      title: 'MCP intro',
      channel: 'A',
      position: 'MCP simplifies integrations',
      includedInSynthesis: true,
    },
    {
      videoId: 'v2',
      sourceId: 's2',
      voiceIndex: 2,
      title: 'MCP security',
      channel: 'B',
      position: 'Security is immature',
      includedInSynthesis: true,
    },
  ],
  claims: [
    {
      claimId: 'c1',
      videoId: 'v1',
      sourceId: 's1',
      voiceIndex: 1,
      claim: 'MCP reduces integration complexity between AI tools.',
      evidence: 'quote',
      timestamp: 10,
      confidence: 'strong',
    },
    {
      claimId: 'c2',
      videoId: 'v2',
      sourceId: 's2',
      voiceIndex: 2,
      claim: 'MCP security standards are not mature enough for production.',
      evidence: 'quote',
      timestamp: 20,
      confidence: 'moderate',
    },
  ],
  verifiedRelationships: [
    {
      id: 'r1',
      fromClaimId: 'c1',
      toClaimId: 'c2',
      fromVideoId: 'v1',
      toVideoId: 'v2',
      type: 'DISAGREEMENT',
      explanation: 'One emphasizes speed; the other warns about production readiness.',
      confidence: 'moderate',
    },
  ],
  rejectedRelationships: [],
  consensus: [],
  disagreements: [],
  uncertainClaims: [],
  synthesis: {
    headline: 'Adopt for tooling first',
    explanation: 'test',
    confidence: 'moderate',
  },
  emergentInsights: [],
  emergentInsightMissing: true,
  knowledgeGaps: [],
  landscape: {
    agree: { countLabel: '0', cards: [] },
    divide: { countLabel: '1', cards: [{ id: 'd1', title: 'Production readiness', summary: '' }] },
    unclear: { countLabel: '0', cards: [] },
  },
  createdAt: new Date().toISOString(),
})

describe('relationship-map-model', () => {
  it('builds claim link items with claim text', () => {
    const items = buildClaimLinkItems(baseSurvival())
    expect(items).toHaveLength(1)
    expect(items[0].fromClaim.claim).toContain('integration complexity')
    expect(items[0].toClaim.claim).toContain('security standards')
  })

  it('extracts topics from question and landscape', () => {
    const topics = extractMapTopics(baseSurvival())
    expect(topics.some((t) => t.includes('MCP'))).toBe(true)
    expect(topics.some((t) => t.includes('Production readiness'))).toBe(true)
  })
})
