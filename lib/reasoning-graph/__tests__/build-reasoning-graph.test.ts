import { describe, expect, it } from 'vitest'
import {
  buildReasoningGraph,
  descendants,
  resolveAskFocus,
  resolveProvenanceNodeId,
} from '@/lib/reasoning-graph/build-reasoning-graph'
import { isNodeVisible } from '@/lib/reasoning-graph/layout'
import { buildExplorerFromSurvival } from '@/lib/visualization/relationship-explorer-model'
import { buildReasoningGraphFromExplorer } from '@/lib/reasoning-graph/build-reasoning-graph'
import type { SurvivalAnalysis } from '@/lib/survival/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function minimalSurvival(overrides: Partial<SurvivalAnalysis> = {}): SurvivalAnalysis {
  return {
    version: 'survival-v1',
    sources: [
      {
        sourceId: 's1',
        videoId: 'yt1',
        voiceIndex: 1,
        title: 'A',
        channel: 'A',
        position: 'Pro',
        includedInSynthesis: true,
      },
      {
        sourceId: 's2',
        videoId: 'yt2',
        voiceIndex: 2,
        title: 'B',
        channel: 'B',
        position: 'Con',
        includedInSynthesis: true,
      },
    ],
    claims: [
      {
        claimId: 'c1',
        sourceId: 's1',
        videoId: 'yt1',
        voiceIndex: 1,
        claim: 'MCP is easy.',
        evidence: 'quote',
        timestamp: 60,
        confidence: 'strong',
      },
      {
        claimId: 'c2',
        sourceId: 's2',
        videoId: 'yt2',
        voiceIndex: 2,
        claim: 'MCP is risky.',
        evidence: 'quote2',
        timestamp: 90,
        confidence: 'moderate',
      },
    ],
    verifiedRelationships: [
      {
        id: 'r1',
        fromClaimId: 'c1',
        toClaimId: 'c2',
        fromVideoId: 'yt1',
        toVideoId: 'yt2',
        type: 'DISAGREEMENT',
        explanation: 'Different views.',
        confidence: 'moderate',
      },
    ],
    rejectedRelationships: [],
    consensus: [],
    disagreements: [],
    uncertainClaims: [],
    synthesis: {
      headline: 'Teams should weigh MCP carefully',
      explanation: 'Benefits and risks both appear across sources.',
      confidence: 'moderate',
    },
    emergentInsights: [],
    emergentInsightMissing: true,
    knowledgeGaps: [],
    landscape: {
      agree: { countLabel: '0', cards: [] },
      divide: { countLabel: '1', cards: [] },
      unclear: { countLabel: '0', cards: [] },
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const doc: SynthesisDocument = {
  id: 't',
  number: 'T',
  createdAt: new Date().toISOString(),
  status: 'complete',
  voices: [],
}

describe('buildReasoningGraphFromExplorer', () => {
  it('CASE B: exposes level-0 nodes only on first paint', () => {
    const survival = minimalSurvival()
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex, survival.synthesis.explanation, 'moderate')

    const defaultVisible = graph.nodes.filter((n) => n.defaultVisible)
    expect(defaultVisible.length).toBeGreaterThanOrEqual(5)
    expect(defaultVisible.length).toBeLessThanOrEqual(9)
    expect(defaultVisible.some((n) => n.type === 'question')).toBe(true)
    expect(defaultVisible.some((n) => n.type === 'judgment')).toBe(true)
    expect(defaultVisible.some((n) => n.type === 'disagreement')).toBe(true)
  })

  it('CASE D: sparse graph shows honest empty state', () => {
    const survival = minimalSurvival({ verifiedRelationships: [] })
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex)
    expect(graph.hasVerifiedRelationships).toBe(false)
    expect(graph.nodes.some((n) => n.id === 'node_sparse')).toBe(true)
  })

  it('expands claims only under expanded parents', () => {
    const survival = minimalSurvival()
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex)
    const claim = graph.nodes.find((n) => n.type === 'claim')
    expect(claim).toBeDefined()
    expect(isNodeVisible(claim!, new Set(), 'all')).toBe(false)
    expect(isNodeVisible(claim!, new Set([claim!.parentIds[0]!]), 'all')).toBe(true)
  })

  it('divide filter hides agree branch', () => {
    const survival = minimalSurvival()
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex)
    const agree = graph.nodes.find((n) => n.id === 'branch_agree')!
    const divide = graph.nodes.find((n) => n.id === 'branch_divide')!
    expect(isNodeVisible(agree, new Set(), 'divide')).toBe(false)
    expect(isNodeVisible(divide, new Set(), 'divide')).toBe(true)
  })

  it('uses unique edge ids (no duplicate from/to pairs)', () => {
    const survival = minimalSurvival()
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex)
    const ids = graph.edges.map((e) => e.id)
    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe('buildReasoningGraph', () => {
  it('returns null when no explorer data', () => {
    expect(buildReasoningGraph({ ...doc, voices: [] })).toBeNull()
  })
})

describe('helpers', () => {
  it('resolveAskFocus maps suggestion questions', () => {
    expect(resolveAskFocus('What does everyone agree on?')).toBe('agree')
    expect(resolveAskFocus('What is the biggest disagreement?')).toBe('divide')
    expect(resolveAskFocus('What are they missing?')).toBe('gap')
  })

  it('resolveProvenanceNodeId maps targets', () => {
    expect(resolveProvenanceNodeId('__filter_agree__', 'agree')).toBe('branch_agree')
    expect(resolveProvenanceNodeId('p1', 'pattern')).toBe('pattern_p1')
    expect(resolveProvenanceNodeId('g1', 'gap')).toBe('gap_g1')
  })

  it('descendants includes subtree', () => {
    const survival = minimalSurvival()
    const ex = buildExplorerFromSurvival(survival)!
    const graph = buildReasoningGraphFromExplorer(ex)
    const desc = descendants(graph, 'branch_divide')
    expect(desc.has('branch_divide')).toBe(true)
  })
})
