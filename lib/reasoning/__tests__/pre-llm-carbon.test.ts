import { describe, expect, it } from 'vitest'
import { passesVerificationPreGate } from '@/lib/reasoning/verification-alignment'
import { loadBlindFixtureSources } from '@/lib/reasoning/eval/blind-registry'
import { filterHighSignalClaims, ingestSourceUnderstanding } from '@/lib/reasoning/source-ingest'

describe('carbon pricing PRE_LLM', () => {
  it('renewable agreement passes PRE_LLM', () => {
    const sources = loadBlindFixtureSources('blind-complex-carbon-pricing')
    const claims = filterHighSignalClaims(ingestSourceUnderstanding(sources).claims)
    const from = claims.find((c) => c.id === 'source_1_section_1_claim_1')!
    const to = claims.find((c) => c.id === 'source_2_section_1_claim_1')!
    console.log('claims count', claims.length, claims.map((c) => c.id))
    const result = passesVerificationPreGate(from, to, 'AGREEMENT')
    console.log(result)
    expect(result.passed).toBe(true)
  })
})
