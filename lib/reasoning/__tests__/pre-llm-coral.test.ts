import { describe, expect, it } from 'vitest'
import { passesVerificationPreGate } from '@/lib/reasoning/verification-alignment'
import { loadBlindFixtureSources } from '@/lib/reasoning/eval/blind-registry'
import { filterHighSignalClaims, ingestSourceUnderstanding } from '@/lib/reasoning/source-ingest'

describe('PRE_LLM gates on blind fixtures', () => {
  it('coral complementary passes PRE_LLM', () => {
    const sources = loadBlindFixtureSources('blind-complementary-coral')
    const claims = filterHighSignalClaims(ingestSourceUnderstanding(sources).claims)
    const from = claims.find((c) => c.sourceId === 'source_1')!
    const to = claims.find((c) => c.sourceId === 'source_2')!
    const result = passesVerificationPreGate(from, to, 'COMPLEMENTARY')
    console.log(result)
    expect(result.passed).toBe(true)
  })
})
