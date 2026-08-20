import { describe, expect, it } from 'vitest'
import {
  consensusLabel,
  filterGenericSections,
  headingForSection,
  normalizeSynthesisSections,
} from '@/lib/synthesis/consensus-rules'
import {
  filterQualityInsights,
  isGenericInsight,
  passesTraceabilityTest,
} from '@/lib/synthesis/insight-quality'
import { computeRelationshipStats } from '@/lib/synthesis/relationship-stats'
import { inferSynthesisType } from '@/lib/synthesis/synthesis-type'
import { computeSetAnalysis, toSourceKnowledge } from '@/lib/types/knowledge'
import type { ClaimRelationship, Insight, RelationshipGraph, SynthesisPoint } from '@/lib/types/relationship'
import type { SourceAnalysis } from '@/lib/types/source'

function makeGraph(partial: Partial<RelationshipGraph>): RelationshipGraph {
  const relationships = partial.relationships ?? []
  return {
    relationships,
    clusters: partial.clusters ?? [],
    independentSourceIds: partial.independentSourceIds ?? [],
    stats: computeRelationshipStats(relationships),
  }
}

function makeRel(partial: Partial<ClaimRelationship> & Pick<ClaimRelationship, 'id' | 'type'>): ClaimRelationship {
  return {
    fromClaimId: 'c1',
    toClaimId: 'c2',
    fromSourceId: 'source_1',
    toSourceId: 'source_2',
    strength: 0.85,
    confidence: 0.8,
    explanation: 'test',
    ...partial,
  }
}

function makeSection(
  partial: Partial<SynthesisPoint> & Pick<SynthesisPoint, 'section' | 'statement' | 'sourceIds'>,
): SynthesisPoint {
  return {
    id: 's1',
    label: '',
    claimIds: [],
    supportCount: partial.sourceIds.length,
    totalSources: 3,
    confidence: 0.8,
    ...partial,
  }
}

function makeInsight(partial: Partial<Insight> & Pick<Insight, 'id' | 'statement'>): Insight {
  return {
    type: 'cross_source_inference',
    sourceIds: ['source_1', 'source_2'],
    claimIds: ['c1', 'c2'],
    relationshipIds: ['r1'],
    patternIds: ['p1'],
    noveltyScore: 0.8,
    confidence: 0.75,
    derivation: 'Claim A + Claim B → structural parallel → pattern → insight',
    ...partial,
  }
}

describe('consensus rules', () => {
  it('3/3 is consensus', () => {
    expect(consensusLabel(3, 3)).toBe('consensus')
    expect(headingForSection('agreement', 3, 3)).toBe('WHERE THEY AGREE')
  })

  it('1/3 is unique view — never consensus', () => {
    expect(consensusLabel(1, 3)).toBe('unique_view')
  })

  it('reclassifies 1-of-N agreement to unique_view', () => {
    const sections = normalizeSynthesisSections(
      [
        makeSection({
          id: 'a1',
          section: 'agreement',
          statement: 'Only one source claims this.',
          sourceIds: ['source_1'],
        }),
      ],
      3,
    )
    expect(sections[0].section).toBe('unique_view')
  })
})

describe('insight quality', () => {
  it('rejects generic insights', () => {
    expect(isGenericInsight('Technology is shaping both industries.')).toBe(true)
    expect(isGenericInsight('The challenges faced in both filmmaking and startups can drive innovation.')).toBe(true)
  })

  it('requires traceability lineage', () => {
    expect(
      passesTraceabilityTest(
        makeInsight({ id: 'i1', statement: 'Specific insight', claimIds: [], relationshipIds: [], patternIds: [], derivation: '' }),
      ),
    ).toBe(false)
  })

  it('accepts well-formed cross-source insight', () => {
    const insights = filterQualityInsights([
      makeInsight({
        id: 'i1',
        statement: 'Film raises the production ceiling while AI lowers the entry floor for building software.',
      }),
    ])
    expect(insights).toHaveLength(1)
  })

  it('filters generic cross-source insight', () => {
    const insights = filterQualityInsights([
      makeInsight({
        id: 'i1',
        statement: 'Both sources show the importance of technology.',
      }),
    ])
    expect(insights).toHaveLength(0)
  })
})

describe('TEST 1 — strong consensus', () => {
  it('infers strong_consensus', () => {
    const graph = makeGraph({
      relationships: [
        makeRel({ id: 'r1', type: 'agreement', fromSourceId: 'source_1', toSourceId: 'source_2', strength: 0.9 }),
        makeRel({ id: 'r2', type: 'agreement', fromSourceId: 'source_2', toSourceId: 'source_3', strength: 0.88 }),
      ],
    })
    expect(inferSynthesisType(graph, 3)).toBe('strong_consensus')
  })
})

describe('TEST 2 — divergent', () => {
  it('infers divergent when disagreements dominate', () => {
    const graph = makeGraph({
      relationships: [makeRel({ id: 'r1', type: 'disagreement', strength: 0.85 })],
    })
    expect(inferSynthesisType(graph, 2)).toBe('divergent')
  })
})

describe('TEST 3 — unrelated sources', () => {
  it('does not treat 1-of-3 as consensus', () => {
    const sections = normalizeSynthesisSections(
      [
        makeSection({
          id: 'a1',
          section: 'agreement',
          statement: 'AI technology and online entrepreneurship are shaping the future.',
          sourceIds: ['source_1'],
        }),
      ],
      3,
    )
    expect(sections.every((s) => s.section !== 'agreement')).toBe(true)
  })

  it('infers clustered or mostly_independent', () => {
    const graph = makeGraph({
      relationships: [
        makeRel({ id: 'r1', type: 'shared_topic', strength: 0.25 }),
      ],
      independentSourceIds: ['source_1', 'source_2', 'source_3'],
    })
    const type = inferSynthesisType(graph, 3)
    expect(['clustered', 'mostly_independent']).toContain(type)
  })
})

describe('TEST 4 — completely unrelated', () => {
  it('infers mostly_independent', () => {
    const graph = makeGraph({ independentSourceIds: ['source_1', 'source_2', 'source_3'] })
    expect(inferSynthesisType(graph, 3)).toBe('mostly_independent')
  })
})

describe('TEST 5 — structural parallel', () => {
  it('recognizes structural_parallel as meaningful', () => {
    const graph = makeGraph({
      relationships: [
        makeRel({
          id: 'r1',
          type: 'structural_parallel',
          explanation: 'Different domains, similar transformation: technology changes production boundaries.',
          strength: 0.82,
        }),
      ],
    })
    expect(inferSynthesisType(graph, 2)).toBe('mixed')
    expect(graph.stats.strong).toBe(1)
  })
})

function makeSource(id: string, claims: string[]): SourceAnalysis {
  return {
    sourceId: id,
    videoId: id,
    voiceIndex: Number(id.replace('source_', '')),
    title: id,
    summary: '',
    thesis: '',
    topics: [],
    claims: claims.map((statement, i) => ({
      id: `${id}_claim_${i + 1}`,
      sourceId: id,
      statement,
      topic: 'general',
      confidence: 0.8,
    })),
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [],
    stance: null,
  }
}

describe('set analysis engine', () => {
  it('computes intersection from agreement relationships', () => {
    const sources = [
      makeSource('source_1', ['AI infra is critical']),
      makeSource('source_2', ['Compute infrastructure determines AI leadership']),
    ]
    const knowledge = sources.map(toSourceKnowledge)
    const relationships: ClaimRelationship[] = [
      {
        id: 'r1',
        fromClaimId: 'source_1_claim_1',
        toClaimId: 'source_2_claim_1',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        type: 'agreement',
        strength: 0.9,
        confidence: 0.85,
        explanation: 'Both argue infrastructure is decisive.',
      },
    ]
    const result = computeSetAnalysis(knowledge, relationships)
    expect(result.intersections).toHaveLength(1)
    expect(result.noStrongIntersection).toBe(false)
  })

  it('computes differences for unconnected claims', () => {
    const sources = [
      makeSource('source_1', ['IMAX enables impossible shots']),
      makeSource('source_2', ['AI agents reduce dev time']),
    ]
    const knowledge = sources.map(toSourceKnowledge)
    const result = computeSetAnalysis(knowledge, [])
    expect(result.differences.length).toBeGreaterThan(0)
    expect(result.noStrongIntersection).toBe(true)
  })

  it('detects contradictions from disagreement relationships', () => {
    const sources = [makeSource('source_1', ['Scaling continues']), makeSource('source_2', ['Scaling hits limits'])]
    const knowledge = sources.map(toSourceKnowledge)
    const relationships: ClaimRelationship[] = [
      {
        id: 'r1',
        fromClaimId: 'source_1_claim_1',
        toClaimId: 'source_2_claim_1',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        type: 'disagreement',
        strength: 0.88,
        confidence: 0.9,
        explanation: 'Direct conflict on scaling limits.',
      },
    ]
    const result = computeSetAnalysis(knowledge, relationships)
    expect(result.contradictions).toHaveLength(1)
  })

  it('detects structural parallel as intersection', () => {
    const sources = [
      makeSource('source_1', ['New camera tech raises production ceiling']),
      makeSource('source_2', ['AI agents lower development barrier']),
    ]
    const knowledge = sources.map(toSourceKnowledge)
    const relationships: ClaimRelationship[] = [
      {
        id: 'r1',
        fromClaimId: 'source_1_claim_1',
        toClaimId: 'source_2_claim_1',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        type: 'structural_parallel',
        strength: 0.82,
        confidence: 0.85,
        explanation: 'Different domains, same transformation structure.',
      },
    ]
    const result = computeSetAnalysis(knowledge, relationships)
    expect(result.intersections[0].kind).toBe('structural_parallel')
  })
})

describe('relationship stats', () => {
  it('counts independent relationships', () => {
    const stats = computeRelationshipStats([
      makeRel({ id: 'r1', type: 'agreement', strength: 0.9 }),
      makeRel({ id: 'r2', type: 'independent', strength: 0.1 }),
      makeRel({ id: 'r3', type: 'independent', strength: 0.15 }),
    ])
    expect(stats.strong).toBe(1)
    expect(stats.independent).toBe(2)
    expect(stats.tested).toBe(3)
  })
})
