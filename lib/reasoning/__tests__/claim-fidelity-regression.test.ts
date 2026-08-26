import { describe, expect, it } from 'vitest'
import { applyClaimQualityGate } from '@/lib/reasoning/claim-quality'
import { assessClaimFidelity } from '@/lib/reasoning/claim-fidelity'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

function claim(id: string, sourceId: string, statement: string, evidenceId: string): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: 1,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: [evidenceId],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: ['mcp'],
  }
}

function evidence(id: string, sourceId: string, text: string): ReasoningEvidence {
  return {
    id,
    sourceId,
    videoId: sourceId,
    timestampStart: 30,
    timestampEnd: null,
    text,
    confidence: 0.9,
  }
}

describe('claim fidelity regression', () => {
  describe('observation → generalization', () => {
    const ev = evidence('ev1', 'source_1', "I've seen a lot more MCP videos lately.")
    const allowed = claim('c1', 'source_1', "The speaker has observed more MCP-related videos recently.", 'ev1')
    const rejected = claim('c2', 'source_1', 'MCP dominates the AI market.', 'ev1')

    it('allows speaker-scoped observation', () => {
      const result = applyClaimQualityGate({
        claims: [allowed],
        evidence: [ev],
      })
      expect(result.accepted.length).toBe(1)
      expect(result.accepted[0].fidelityStatus).toBe('SUPPORTED')
    })

    it('rejects market-wide exaggeration', () => {
      const fidelity = assessClaimFidelity(rejected, ev.text)
      expect(fidelity.status).toBe('OVERSTATED')
      expect(fidelity.mutations).toContain('OBSERVATION_TO_FACT')

      const result = applyClaimQualityGate({
        claims: [rejected],
        evidence: [ev],
      })
      expect(result.accepted.length).toBe(0)
      expect(result.stats.overstatedRejected).toBeGreaterThan(0)
    })
  })

  describe('correlation → causation', () => {
    const ev = evidence(
      'ev1',
      'source_1',
      'MCP is easier to configure and has become popular.',
    )
    const rejected = claim(
      'c1',
      'source_1',
      'MCP became popular because it is easier to configure.',
      'ev1',
    )

    it('rejects inferred causation without causal evidence', () => {
      const fidelity = assessClaimFidelity(rejected, ev.text)
      expect(fidelity.mutations).toContain('CORRELATION_TO_CAUSATION')
      const result = applyClaimQualityGate({ claims: [rejected], evidence: [ev] })
      expect(result.accepted.length).toBe(0)
      expect(result.stats.causeInferredRejected).toBe(1)
    })
  })

  describe('possibility → certainty', () => {
    const ev = evidence('ev1', 'source_1', 'MCP could make integration easier.')
    const rejected = claim('c1', 'source_1', 'MCP makes integration easier.', 'ev1')

    it('rejects certainty upgrade', () => {
      const fidelity = assessClaimFidelity(rejected, ev.text)
      expect(fidelity.mutations).toContain('POSSIBILITY_TO_CERTAINTY')
      const result = applyClaimQualityGate({ claims: [rejected], evidence: [ev] })
      expect(result.accepted.length).toBe(0)
    })
  })

  describe('personal → universal', () => {
    const ev = evidence('ev1', 'source_1', 'I found MCP easier than using APIs directly.')
    const allowed = claim(
      'c1',
      'source_1',
      'The speaker found MCP easier than direct API usage.',
      'ev1',
    )
    const rejected = claim('c2', 'source_1', 'MCP is easier than APIs.', 'ev1')

    it('allows speaker-scoped personal comparison', () => {
      const result = applyClaimQualityGate({ claims: [allowed], evidence: [ev] })
      expect(result.accepted.length).toBe(1)
    })

    it('rejects universal generalization from personal evidence', () => {
      const fidelity = assessClaimFidelity(rejected, ev.text)
      expect(fidelity.mutations).toContain('PERSONAL_TO_UNIVERSAL')
      const result = applyClaimQualityGate({ claims: [rejected], evidence: [ev] })
      expect(result.accepted.length).toBe(0)
    })
  })

  describe('suspicious MCP claims audit', () => {
    const cases = [
      {
        evidence:
          'People are talking about MCP pricing being simpler than traditional API billing.',
        claim:
          'The rapid market dominance is attributable to the simplified pricing model of MCP.',
        expectOverstated: true,
      },
      {
        evidence: "I've noticed a lot of MCP videos on YouTube recently.",
        claim: 'MCP stories are almost completely dominating YouTube content.',
        expectOverstated: true,
      },
      {
        evidence: 'MCP felt more user-friendly when I tried connecting tools.',
        claim:
          'MCP offers a more user-friendly experience than API, which leads to faster adoption.',
        expectOverstated: true,
      },
      {
        evidence: 'You can deploy MCP integrations faster than wiring separate APIs.',
        claim:
          "MCP's integrated solutions can be deployed more quickly than disparate API systems.",
        expectSupported: true,
      },
    ]

    for (const row of cases) {
      it(`audits: ${row.claim.slice(0, 50)}…`, () => {
        const fidelity = assessClaimFidelity(
          claim('c', 'source_1', row.claim, 'ev'),
          row.evidence,
        )
        if (row.expectOverstated) {
          expect(fidelity.status).toBe('OVERSTATED')
        }
        if (row.expectSupported) {
          expect(fidelity.status).toBe('SUPPORTED')
        }
      })
    }
  })
})
