import { describe, expect, it } from 'vitest'
import { buildProductionPipelineDiagnostics } from '@/lib/production/build-pipeline-diagnostics'
import { createSynthesisDocument } from '@/lib/types/synthesis-document'
import { createSourceId } from '@/lib/types/source'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

describe('buildProductionPipelineDiagnostics', () => {
  it('aggregates per-source funnel from document and reasoning', () => {
    const doc = createSynthesisDocument('syn-test', [
      {
        id: 'v1',
        n: 1,
        youtubeId: 'abc123',
        url: 'https://youtu.be/abc123',
        title: 'Video A',
        channel: 'Ch A',
        duration: '10:00',
      },
      {
        id: 'v2',
        n: 2,
        youtubeId: 'def456',
        url: 'https://youtu.be/def456',
        title: 'Video B',
        channel: 'Ch B',
        duration: '8:00',
      },
    ])

    doc.voices[0] = {
      ...doc.voices[0],
      analysis: {
        sourceId: createSourceId(1),
        videoId: 'abc123',
        voiceIndex: 1,
        title: 'Video A',
        channel: 'Ch A',
        url: 'https://youtu.be/abc123',
        claims: [
          {
            claimId: 'c1',
            text: 'Claim one',
            evidenceIds: ['e1'],
          },
        ],
        evidence: [
          {
            evidenceId: 'e1',
            text: 'Evidence one',
            startTime: 120,
            endTime: 130,
          },
        ],
      },
    }
    doc.voices[1] = {
      ...doc.voices[1],
      error: 'No transcript',
      failure: {
        sourceId: createSourceId(2),
        videoId: 'def456',
        title: 'Video B',
        code: 'no_transcript',
        message: 'No transcript',
      },
    }

    const reasoning: MultiSourceReasoning = {
      mode: 'multi',
      version: 'reasoning-v2.2',
      centralQuestion: 'Test?',
      relationships: [
        {
          relationshipId: 'r1',
          type: 'AGREEMENT',
          verificationStatus: 'SUPPORTED',
          claimIds: ['c1', 'c2'],
          sourceIds: [createSourceId(1), createSourceId(2)],
          summary: 'They agree',
        },
      ],
      patterns: [],
      insights: [],
      excludedSources: [],
      pipelineStats: {
        claimsExtracted: 3,
        funnelFinalUsable: 2,
        generationEligible: 2,
        candidatePairs: 1,
        verifiedRelationships: 1,
      },
    }

    const diag = buildProductionPipelineDiagnostics({ document: doc, reasoning })

    expect(diag.requestedSources).toBe(2)
    expect(diag.analyzedSources).toBe(1)
    expect(diag.failedSources).toBe(1)
    expect(diag.funnel.claimsExtracted).toBe(3)
    expect(diag.funnel.verifiedRelationships).toBe(1)
    expect(diag.funnel.agreement).toBe(1)
    expect(diag.perSource).toHaveLength(2)
    expect(diag.perSource[0].status).toBe('analyzed')
    expect(diag.perSource[0].claimsExtracted).toBe(1)
    expect(diag.perSource[1].status).toBe('failed')
    expect(diag.perSource[1].transcriptOk).toBe(false)
  })
})
