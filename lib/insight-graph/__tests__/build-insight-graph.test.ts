import { describe, expect, it } from 'vitest'
import { buildInsightGraph } from '@/lib/insight-graph/build-insight-graph'
import type { VideoNodeData } from '@/lib/types/insight-graph'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis } from '@/lib/types/source'

function makeSource(index: number, claims: string[]): SourceAnalysis {
  const sourceId = `source_${index}`
  return {
    sourceId,
    videoId: `vid_${index}`,
    voiceIndex: index,
    title: `Video ${index}`,
    summary: 'summary',
    thesis: 'thesis',
    topics: ['AI leverage'],
    claims: claims.map((statement, i) => ({
      id: `${sourceId}_claim_${i + 1}`,
      sourceId,
      statement,
      topic: 'AI leverage',
      confidence: 0.8,
    })),
    entities: [{ id: `${sourceId}_e1`, name: 'AI leverage', type: 'concept' }],
    conclusions: [],
    implications: [],
    evidence: [
      { id: `${sourceId}_ev1`, timestamp: 42, text: `Evidence for ${claims[0] ?? 'claim'}` },
    ],
    stance: null,
  }
}

function makeResult(partial: Partial<SynthesisResult> = {}): SynthesisResult {
  return {
    sources: [],
    relationships: [],
    patterns: [],
    setAnalysis: {
      intersections: [
        {
          id: 'int_1',
          label: 'AI lowers creation cost',
          description: 'Both argue AI increases leverage',
          kind: 'structural_parallel',
          sourceIds: ['source_1', 'source_2'],
          claimIds: ['source_1_claim_1', 'source_2_claim_1'],
          relationshipIds: ['rel_1'],
          confidence: 0.85,
        },
      ],
      differences: [],
      contradictions: [],
      noStrongIntersection: false,
    },
    synthesis: {
      synthesisType: 'mixed',
      topic: 'AI and teams',
      bottomLine: 'AI changes leverage',
      overallConclusion: 'conclusion',
      emergentStatement: 'Creation becomes cheap',
      sections: [],
      usedSourceIds: ['source_1', 'source_2', 'source_3'],
      sourceContributions: [],
      noStrongRelationship: false,
    },
    insights: [],
    knowledge: { gaps: [], recommendations: [], rejectedInsights: [] },
    fourthIdea: {
      id: 'fi_1',
      statement: 'Judgment becomes the bottleneck when creation is cheap',
      explanation: 'Combines cost, leverage, and distribution',
      sourceIds: ['source_1', 'source_2', 'source_3'],
      claimIds: ['source_1_claim_1', 'source_2_claim_1', 'source_3_claim_1'],
      relationshipIds: ['rel_1'],
      patternIds: [],
      noveltyScore: 0.9,
      specificityScore: 0.8,
      confidence: 0.85,
      derivationSummary:
        'Not stated by any single source — emerges from falling creation cost and distribution constraints.',
    },
    ...partial,
  }
}

describe('buildInsightGraph', () => {
  it('builds video, relationship, and insight nodes with provenance', () => {
    const sources = [
      makeSource(1, ['AI lowers software cost']),
      makeSource(2, ['Small teams gain leverage']),
      makeSource(3, ['Distribution is the bottleneck']),
    ]
    const result = makeResult()
    const graph = buildInsightGraph({ result, sources })

    expect(graph.summary.voiceCount).toBe(3)
    expect(graph.summary.insightCount).toBeGreaterThanOrEqual(1)
    expect(graph.nodes.some((n) => n.type === 'video')).toBe(true)
    expect(graph.nodes.some((n) => n.type === 'shared')).toBe(true)
    expect(graph.nodes.some((n) => n.type === 'insight' && n.defaultVisible)).toBe(true)

    const insight = graph.nodes.find((n) => n.type === 'insight')
    expect(insight?.data).toMatchObject({
      statement: expect.stringContaining('Judgment'),
      noveltyReason: expect.any(String),
      sourceIds: expect.arrayContaining(['source_1', 'source_2']),
    })

    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('hides concept and claim nodes by default', () => {
    const sources = [makeSource(1, ['claim a']), makeSource(2, ['claim b'])]
    const graph = buildInsightGraph({ result: makeResult(), sources })

    const hidden = graph.nodes.filter((n) => n.type === 'concept' || n.type === 'claim')
    expect(hidden.length).toBeGreaterThan(0)
    expect(hidden.every((n) => !n.defaultVisible)).toBe(true)
  })

  it('dedupes duplicate claim ids in video keyClaims', () => {
    const source = makeSource(1, ['claim a', 'claim b'])
    source.claims.push({
      ...source.claims[0],
      statement: 'claim a variant',
      confidence: 0.9,
    })

    const graph = buildInsightGraph({ result: makeResult(), sources: [source] })
    const video = graph.nodes.find((n) => n.type === 'video')
    const keyClaims =
      video?.type === 'video' ? (video.data as VideoNodeData).keyClaims : []
    const ids = keyClaims.map((c: { id: string }) => c.id)

    expect(ids).toHaveLength(new Set(ids).size)
    expect(ids.filter((id: string) => id === 'source_1_claim_1')).toHaveLength(1)
  })
})
