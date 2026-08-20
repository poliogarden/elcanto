import { describe, expect, it } from 'vitest'
import { synthesisCollectionKey, videoCacheKey } from '@/lib/cache/keys'
import {
  assertSynthesisCoverage,
  findMissingSourceIds,
  isPartialCoverage,
} from '@/lib/synthesis/coverage'
import { buildCoverage, createSourceId, validateAnalysisCoverage } from '@/lib/types/source'

describe('coverage validation', () => {
  it('Test E — detects missing sources in synthesis result', () => {
    const missing = findMissingSourceIds(['source_1', 'source_2', 'source_3'], ['source_1', 'source_2'])
    expect(missing).toEqual(['source_3'])
  })

  it('Test E — partial coverage when one source fails', () => {
    const coverage = buildCoverage(
      [
        { sourceId: 'source_1', videoId: 'a', voiceIndex: 1, title: 'A', channel: '', url: '' },
        { sourceId: 'source_2', videoId: 'b', voiceIndex: 2, title: 'B', channel: '', url: '' },
        { sourceId: 'source_3', videoId: 'c', voiceIndex: 3, title: 'C', channel: '', url: '' },
      ],
      [
        {
          sourceId: 'source_1',
          videoId: 'a',
          voiceIndex: 1,
          title: 'A',
          summary: '',
          thesis: '',
          topics: [],
          claims: [],
          entities: [],
          conclusions: [],
          mainClaims: [],
          keyFacts: [],
          keyPeople: [],
          keyTopics: [],
          arguments: [],
          evidence: [],
          implications: [],
          stance: null,
        },
        {
          sourceId: 'source_2',
          videoId: 'b',
          voiceIndex: 2,
          title: 'B',
          summary: '',
          thesis: '',
          topics: [],
          claims: [],
          entities: [],
          conclusions: [],
          mainClaims: [],
          keyFacts: [],
          keyPeople: [],
          keyTopics: [],
          arguments: [],
          evidence: [],
          implications: [],
          stance: null,
        },
      ],
      [{ sourceId: 'source_3', videoId: 'c', title: 'C', code: 'unavailable', message: 'fail' }],
    )
    expect(isPartialCoverage(coverage)).toBe(true)
    expect(coverage.requestedSourceCount).toBe(3)
    expect(coverage.analyzedSourceCount).toBe(2)
  })

  it('Test C — all 5 sources must be in analyzed set', () => {
    const requested = Array.from({ length: 5 }, (_, i) => ({
      sourceId: createSourceId(i + 1),
      videoId: `v${i}`,
      voiceIndex: i + 1,
      title: `V${i}`,
      channel: '',
      url: '',
    }))
    const analyzed = requested.map((s) => ({
      ...s,
      summary: 's',
      thesis: 't',
      topics: [],
      claims: [],
      entities: [],
      conclusions: [],
      mainClaims: [],
      keyFacts: [],
      keyPeople: [],
      keyTopics: [],
      arguments: [],
      evidence: [],
      implications: [],
      stance: null,
    }))
    const result = validateAnalysisCoverage(requested, analyzed)
    expect(result.ok).toBe(true)
  })
})

describe('cache keys', () => {
  it('analysis cache is per videoId + version', () => {
    const a = videoCacheKey('abc', 'analysis')
    const b = videoCacheKey('xyz', 'analysis')
    expect(a).not.toBe(b)
    expect(a).toContain('abc')
  })

  it('synthesis cache changes when source set changes', () => {
    const one = synthesisCollectionKey(['source_1'])
    const two = synthesisCollectionKey(['source_1', 'source_2'])
    expect(one).not.toBe(two)
  })

  it('Test B — synthesis cache is order-independent', () => {
    const ab = synthesisCollectionKey(['source_1', 'source_2'])
    const ba = synthesisCollectionKey(['source_2', 'source_1'])
    expect(ab).toBe(ba)
  })

  it('synthesis cache includes question', () => {
    const a = synthesisCollectionKey(['source_1', 'source_2'], 'common claims?')
    const b = synthesisCollectionKey(['source_1', 'source_2'], 'disagreements?')
    expect(a).not.toBe(b)
  })
})

describe('synthesis coverage assertion', () => {
  it('Test F — requires all sources in usedSourceIds', () => {
    const result = assertSynthesisCoverage(
      ['source_1', 'source_2'],
      ['source_1', 'source_2'],
    )
    expect(result.ok).toBe(true)
  })

  it('Test D — 10 sources all required', () => {
    const ids = Array.from({ length: 10 }, (_, i) => createSourceId(i + 1))
    const result = assertSynthesisCoverage(ids, ids)
    expect(result.ok).toBe(true)
  })
})
