import { describe, expect, it } from 'vitest'
import { buildCompactAskPayload } from '@/lib/ai/compact-prompt'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis } from '@/lib/types/source'

function minimalSynthesis(): SynthesisResult {
  return {
    sources: [],
    relationships: [
      {
        id: 'r1',
        fromClaimId: 'c1',
        toClaimId: 'c2',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        type: 'disagreement',
        strength: 0.8,
        confidence: 0.7,
        explanation: 'They disagree on AI regulation policy',
      },
    ],
    patterns: [],
    setAnalysis: {
      intersections: [],
      differences: [],
      contradictions: [],
      noStrongIntersection: false,
    },
    synthesis: {
      synthesisType: 'mixed',
      topic: 'AI',
      bottomLine: 'Mixed views',
      overallConclusion: 'Mixed',
      emergentStatement: 'Tension between speed and safety',
      sections: [],
      usedSourceIds: ['source_1', 'source_2'],
      sourceContributions: [],
      noStrongRelationship: false,
    },
    insights: [],
    knowledge: { gaps: [], recommendations: [], rejectedInsights: [] },
  }
}

function minimalSource(id: string): SourceAnalysis {
  return {
    sourceId: id,
    videoId: `vid_${id}`,
    voiceIndex: Number(id.split('_')[1]),
    title: 'Title',
    summary: 'Summary',
    thesis: 'Thesis',
    topics: ['ai'],
    claims: [
      {
        id: `${id}_claim_1`,
        sourceId: id,
        statement: 'AI regulation is necessary for safety',
        topic: 'regulation',
        confidence: 0.8,
      },
    ],
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [{ id: 'e1', timestamp: 10, text: 'regulation evidence' }],
    stance: null,
  }
}

describe('buildCompactAskPayload', () => {
  it('filters synthesis payload by question relevance', () => {
    const synthesis = minimalSynthesis()
    const sources = [minimalSource('source_1'), minimalSource('source_2')]

    const compact = buildCompactAskPayload({
      question: 'Where do they disagree on regulation?',
      synthesis,
      sources,
      relevantChunks: [],
    })

    const json = JSON.stringify(compact.synthesis)
    expect(json).toContain('disagreement')
    expect(json.length).toBeLessThan(JSON.stringify(synthesis).length)
  })
})
