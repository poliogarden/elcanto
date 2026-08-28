import { describe, expect, it } from 'vitest'
import {
  classifyEvidenceSupport,
  isAbstractClaimInflation,
  isReasoningEligible,
  mergeEvidenceStatus,
} from '@/lib/reasoning/claim-evidence'

describe('claim-evidence', () => {
  it('rejects topic similarity without propositional support', () => {
    const result = classifyEvidenceSupport(
      'MCP will transform the AI industry.',
      'MCP is being discussed everywhere.',
    )
    expect(result.status).toBe('NO_EVIDENCE')
  })

  it('accepts paraphrase when overlap is sufficient', () => {
    const result = classifyEvidenceSupport(
      'MCP provides a common protocol for connecting AI applications to tools.',
      'MCP lets different AI applications connect to tools through a common protocol instead of implementing every API separately.',
    )
    expect(['DIRECT_EVIDENCE', 'PARAPHRASE_SUPPORTED']).toContain(result.status)
  })

  it('flags abstract claim inflation from discussion meta', () => {
    expect(
      isAbstractClaimInflation(
        'MCP is a transformative force in AI.',
        'People are talking about MCP a lot lately.',
      ),
    ).toBe(true)
  })

  it('mergeEvidenceStatus prefers strongest tier', () => {
    expect(
      mergeEvidenceStatus(['CONTEXT_SUPPORTED', 'PARAPHRASE_SUPPORTED', 'NO_EVIDENCE']),
    ).toBe('PARAPHRASE_SUPPORTED')
  })

  it('reasoning eligibility excludes NO_EVIDENCE only', () => {
    expect(isReasoningEligible('DIRECT_EVIDENCE')).toBe(true)
    expect(isReasoningEligible('PARAPHRASE_SUPPORTED')).toBe(true)
    expect(isReasoningEligible('CONTEXT_SUPPORTED')).toBe(true)
    expect(isReasoningEligible('NO_EVIDENCE')).toBe(false)
  })
})
