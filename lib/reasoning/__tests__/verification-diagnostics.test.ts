import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { assessVerificationAlignment } from '@/lib/reasoning/verification-alignment'
import {
  buildVerificationDiagnosticsBundle,
  evaluateCandidateVerificationCollapseWarning,
} from '@/lib/reasoning/verification-diagnostics'
import type { ReasoningClaim, ReasoningRelationship, RelationshipVerificationDiagnostic } from '@/lib/reasoning/types'

function claim(
  id: string,
  sourceId: string,
  voice: number,
  statement: string,
  opts: Partial<ReasoningClaim> = {},
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: `yt${voice}`,
    voiceIndex: voice,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: opts.evidenceIds ?? [`ev_${id}`],
    claimType: opts.claimType ?? 'factual',
    confidence: 'strong',
    conceptIds: ['concept_mcp'],
    claimQualityClass: opts.claimQualityClass,
    evidenceStrength: opts.evidenceStrength,
    fidelityStatus: opts.fidelityStatus,
    ...opts,
  }
}

describe('verification diagnostics bundle', () => {
  const specific1 = claim(
    'c1',
    'source_1',
    1,
    'MCP provides a standardized interface for connecting AI tools.',
    { evidenceStrength: 'MODERATE' },
  )
  const specific2 = claim(
    'c2',
    'source_2',
    2,
    'MCP can reduce integration complexity between applications and tools.',
    { evidenceStrength: 'MODERATE' },
  )
  const hype3 = claim(
    'c3',
    'source_3',
    3,
    'MCP is a transformative force in the AI ecosystem.',
    {
      evidenceIds: [],
      evidenceStrength: 'NONE',
      claimQualityClass: 'HYPE',
      claimType: 'predictive',
    },
  )
  const meta3 = claim(
    'c4',
    'source_3',
    3,
    'The rise of MCP has generated major discussions among developers.',
    { evidenceIds: [], evidenceStrength: 'NONE', claimQualityClass: 'META' },
  )

  const generationClaims = [specific1, specific2, hype3, meta3]
  const allClaims = generationClaims

  it('builds audit for heuristic candidates with simulated PRE_LLM rejections', () => {
    const heuristic = discoverHeuristicCandidates(generationClaims)
    const candidates = heuristic.all.slice(0, 35)

    const verificationDiagnostics: RelationshipVerificationDiagnostic[] = []
    const rejected: ReasoningRelationship[] = []

    for (const c of candidates) {
      const from = generationClaims.find((cl) => cl.id === c.fromClaimId)!
      const to = generationClaims.find((cl) => cl.id === c.toClaimId)!
      const scores = assessVerificationAlignment(from, to, c.type)
      verificationDiagnostics.push({
        fromClaimId: c.fromClaimId,
        toClaimId: c.toClaimId,
        fromSourceId: from.sourceId,
        toSourceId: to.sourceId,
        fromClaimText: from.statement,
        toClaimText: to.statement,
        proposedType: c.type,
        stage: 'PRE_LLM',
        rejectionReason: scores.passed ? undefined : 'ALIGNMENT_FAILED',
        scores,
      })
      if (!scores.passed) {
        rejected.push({
          id: `rej_${rejected.length}`,
          type: c.type,
          fromClaimId: c.fromClaimId,
          toClaimId: c.toClaimId,
          fromSourceId: from.sourceId,
          toSourceId: to.sourceId,
          fromVideoId: from.videoId,
          toVideoId: to.videoId,
          explanation: scores.reason,
          confidence: 'weak',
          verificationStatus: 'REJECTED',
          rejectionReason: 'ALIGNMENT_FAILED',
        })
      }
    }

    const bundle = buildVerificationDiagnosticsBundle({
      candidates,
      verified: [],
      rejected,
      verificationDiagnostics,
      generationClaims,
      allClaims,
      evidence: [
        {
          id: 'ev_c1',
          sourceId: 'source_1',
          videoId: 'yt1',
          timestampStart: 10,
          timestampEnd: null,
          text: 'MCP standardizes tool connections.',
          confidence: 0.9,
        },
        {
          id: 'ev_c2',
          sourceId: 'source_2',
          videoId: 'yt2',
          timestampStart: 10,
          timestampEnd: null,
          text: 'Integration complexity drops with MCP.',
          confidence: 0.9,
        },
      ],
      relevantSourceIds: ['source_1', 'source_2', 'source_3'],
    })

    expect(bundle.candidateAudit.length).toBe(candidates.length)
    expect(bundle.topCandidates.length).toBeLessThanOrEqual(20)
    expect(bundle.claimSpecificityBySource.length).toBe(3)
    expect(bundle.crossSourceMatrix.length).toBe(3)

    const v1v2 = bundle.crossSourceMatrix.find(
      (r) => r.labelA === 'V1' && r.labelB === 'V2',
    )
    expect(v1v2?.generatedCandidates).toBeGreaterThan(0)

    const warning = evaluateCandidateVerificationCollapseWarning({
      candidateCount: candidates.length,
      verifiedCount: 0,
    })
    expect(warning?.code).toBe('CANDIDATE_VERIFICATION_COLLAPSE')

  // eslint-disable-next-line no-console
    console.log(
      'DIAGNOSTIC_REPORT',
      JSON.stringify({
        rejectionDistribution: bundle.rejectionDistribution,
        crossSourceMatrix: bundle.crossSourceMatrix,
        specificity: bundle.claimSpecificityBySource,
        evidence: bundle.claimEvidenceBySource,
        top5: bundle.topCandidates.slice(0, 5).map((t) => ({
          rank: t.rank,
          v1: t.voiceA,
          v2: t.voiceB,
          type: t.proposedType,
          score: t.candidateScore,
          reject: t.verificationRejectionReason,
          claimA: t.claimA.slice(0, 60),
          claimB: t.claimB.slice(0, 60),
        })),
      }),
    )
  })

  it('flags partial source participation in matrix when V3 has only generic claims', () => {
    const heuristic = discoverHeuristicCandidates(generationClaims)
    const bundle = buildVerificationDiagnosticsBundle({
      candidates: heuristic.all.slice(0, 10),
      verified: [],
      rejected: [],
      verificationDiagnostics: [],
      generationClaims,
      allClaims,
      evidence: [],
      relevantSourceIds: ['source_1', 'source_2', 'source_3'],
    })

    const v3Spec = bundle.claimSpecificityBySource.find((s) => s.voiceIndex === 3)
    expect(v3Spec?.hype + v3Spec?.meta).toBeGreaterThan(0)
  })
})
