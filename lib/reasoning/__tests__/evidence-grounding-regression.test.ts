import { describe, expect, it } from 'vitest'
import { buildComparableClaimPool } from '@/lib/reasoning/comparable-claim-pool'
import { findEvidenceIntegrityViolations } from '@/lib/reasoning/evidence-coverage'
import { mergeHierarchicalAnalysis } from '@/lib/pipeline/video-knowledge-merge'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import type { SectionKnowledge } from '@/lib/types/video-knowledge'

const SEGMENT_TEXT =
  'MCP lets different AI applications connect to tools through a common protocol instead of implementing every API separately.'

function sectionBoundSource(sourceId: string, voiceIndex: number) {
  const sections: SectionKnowledge[] = [
    {
      sectionId: 'seg_17',
      startTime: 102,
      endTime: 111,
      topic: 'MCP protocol',
      summary: SEGMENT_TEXT.slice(0, 120),
      text: SEGMENT_TEXT,
      importanceScore: 0.8,
      argumentDensity: 0.7,
      evidenceDensity: 0.6,
      noveltyScore: 0.5,
      claims: [
        {
          id: `${sourceId}_claim_1`,
          statement:
            'MCP provides a common protocol for connecting AI applications to tools.',
          topic: 'MCP',
          confidence: 0.9,
        },
      ],
    },
    {
      sectionId: 'seg_42',
      startTime: 198,
      endTime: 205,
      topic: 'MCP hype',
      summary: 'MCP is being discussed everywhere in the AI community right now.',
      text: 'MCP is being discussed everywhere in the AI community right now.',
      importanceScore: 0.5,
      argumentDensity: 0.3,
      evidenceDensity: 0.2,
      noveltyScore: 0.4,
      claims: [
        {
          id: `${sourceId}_claim_2`,
          statement: 'MCP will fundamentally transform the AI industry.',
          topic: 'MCP',
          confidence: 0.7,
        },
      ],
    },
  ]

  return mergeHierarchicalAnalysis({
    base: {
      sourceId,
      videoId: `yt${voiceIndex}`,
      voiceIndex,
      title: `MCP ${voiceIndex}`,
    },
    sections,
    deepPartials: [],
    coverageSectionCount: sections.length,
    failedSectionIds: [],
    transcriptDurationSeconds: 600,
  })
}

describe('evidence grounding regression', () => {
  it('binds section claims to transcript spans with evidence status', () => {
    const source = sectionBoundSource('source_1', 1)
    const ingested = ingestSourceUnderstanding([source])
    const claims = filterHighSignalClaims(ingested.claims)

    const supported = claims.find((c) => c.id === 'source_1_claim_1')
    const inflated = claims.find((c) => c.id === 'source_1_claim_2')

    expect(supported?.evidenceStatus).not.toBe('NO_EVIDENCE')
    expect(supported?.reasoningEligible).toBe(true)
    expect(supported?.evidenceSpans?.[0]?.originalText).toContain('common protocol')
    expect(supported?.evidenceSpans?.[0]?.startTime).toBe(102)

    expect(inflated?.evidenceStatus).toBe('NO_EVIDENCE')
    expect(inflated?.reasoningEligible).toBe(false)
  })

  it('excludes NO_EVIDENCE claims from generation pool', () => {
    const sources = [1, 2, 3].map((n) => sectionBoundSource(`source_${n}`, n))
    const ingested = ingestSourceUnderstanding(sources)
    const allClaims = filterHighSignalClaims(ingested.claims)

    const pool = buildComparableClaimPool({
      usableClaims: allClaims,
      evidence: ingested.evidence,
      relevanceDiagnostics: allClaims.map((c) => ({
        claimId: c.id,
        sourceId: c.sourceId,
        claimText: c.statement,
        relevanceScore: 0.9,
        topicScore: 0.8,
        questionAlignmentScore: 0.7,
        sourcePriorScore: 0.8,
        tier: 'PRIMARY' as const,
        decision: 'KEEP' as const,
      })),
      synthesisSourceIds: new Set(['source_1', 'source_2', 'source_3']),
    })

    const violations = findEvidenceIntegrityViolations(pool.generationClaims)
    expect(violations).toHaveLength(0)
    expect(pool.generationClaims.every((c) => c.reasoningEligible)).toBe(true)
    expect(
      pool.generationClaims.every((c) => c.evidenceStatus !== 'NO_EVIDENCE'),
    ).toBe(true)
  })
})
