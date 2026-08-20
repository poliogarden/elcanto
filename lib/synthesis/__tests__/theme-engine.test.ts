import { describe, expect, it } from 'vitest'
import { discoverThemes } from '@/lib/synthesis/theme-engine'
import type { SourceAnalysis } from '@/lib/types/source'

const sources: SourceAnalysis[] = [
  {
    sourceId: 'source_1',
    videoId: 'a',
    voiceIndex: 1,
    title: 'A',
    summary: '',
    thesis: '',
    topics: ['ai'],
    claims: [
      { id: 'c1', sourceId: 'source_1', statement: 'AI lowers cost', topic: 'leverage', confidence: 0.8 },
      { id: 'c2', sourceId: 'source_1', statement: 'Small teams win', topic: 'startups', confidence: 0.7 },
    ],
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [],
    stance: null,
  },
  {
    sourceId: 'source_2',
    videoId: 'b',
    voiceIndex: 2,
    title: 'B',
    summary: '',
    thesis: '',
    topics: ['jobs'],
    claims: [
      { id: 'c3', sourceId: 'source_2', statement: 'Jobs may shrink', topic: 'jobs', confidence: 0.75 },
      { id: 'c4', sourceId: 'source_2', statement: 'Leverage rises', topic: 'leverage', confidence: 0.7 },
    ],
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [],
    stance: null,
  },
]

describe('discoverThemes', () => {
  it('groups cross-source topics', () => {
    const themes = discoverThemes(sources)
    const leverage = themes.find((t) => t.title.toLowerCase().includes('leverage'))
    expect(leverage).toBeTruthy()
    expect(leverage?.sourceIds.length).toBeGreaterThanOrEqual(2)
  })
})
