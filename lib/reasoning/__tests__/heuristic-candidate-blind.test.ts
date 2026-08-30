import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { loadBlindFixtureMeta, loadBlindFixtureSources } from '@/lib/reasoning/eval/blind-registry'
import { filterHighSignalClaims, ingestSourceUnderstanding } from '@/lib/reasoning/source-ingest'

describe('heuristic candidate discovery on blind fixtures', () => {
  it('fasting divide candidate', () => {
    const sources = loadBlindFixtureSources('blind-divide-fasting-weight')
    const claims = filterHighSignalClaims(ingestSourceUnderstanding(sources).claims)
    const h = discoverHeuristicCandidates(claims)
    console.log('fasting candidates', h.all.map((c) => ({ type: c.type, rationale: c.rationale })))
    expect(h.all.some((c) => c.type === 'CONTRADICTION' || c.type === 'TENSION')).toBe(true)
  })

  it('coral complementary candidate', () => {
    const sources = loadBlindFixtureSources('blind-complementary-coral')
    const claims = filterHighSignalClaims(ingestSourceUnderstanding(sources).claims)
    const h = discoverHeuristicCandidates(claims)
    console.log('coral candidates', h.all.map((c) => ({ type: c.type, rationale: c.rationale })))
    expect(h.all.some((c) => c.type === 'COMPLEMENTARY')).toBe(true)
  })

  it('carbon agreement candidate', () => {
    const sources = loadBlindFixtureSources('blind-complex-carbon-pricing')
    const claims = filterHighSignalClaims(ingestSourceUnderstanding(sources).claims)
    const renewable = claims.filter((c) => /renewable|clean energy capital/i.test(c.statement))
    const h = discoverHeuristicCandidates(renewable.length >= 2 ? renewable : claims)
    console.log(
      'carbon candidates',
      h.all.map((c) => ({ type: c.type, from: c.fromClaimId, to: c.toClaimId })),
    )
    expect(h.all.some((c) => c.type === 'AGREEMENT')).toBe(true)
  })
})
