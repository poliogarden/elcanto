import { describe, expect, it } from 'vitest'
import { buildMapFromVoices, DEMO_SYNTHESIS_MAP } from '@/lib/home/visual-synthesis-map-model'
import type { Voice } from '@/lib/types/voice'

function voice(n: number, title: string): Voice {
  return {
    id: `v${n}`,
    n,
    youtubeId: `yt${n}`,
    url: `https://youtube.com/watch?v=${n}`,
    title,
    channel: 'Channel',
    duration: '10:00',
    status: 'ready',
  }
}

describe('buildMapFromVoices', () => {
  it('returns empty state for no voices', () => {
    const map = buildMapFromVoices([])
    expect(map.mode).toBe('empty')
    expect(map.sources).toHaveLength(0)
    expect(map.edges).toHaveLength(0)
  })

  it('returns partial state for one voice', () => {
    const map = buildMapFromVoices([voice(1, 'A')])
    expect(map.mode).toBe('partial')
    expect(map.sources.filter((s) => s.filled)).toHaveLength(1)
  })

  it('returns ready state for three or more', () => {
    const map = buildMapFromVoices([voice(1, 'A'), voice(2, 'B'), voice(3, 'C')])
    expect(map.mode).toBe('ready')
    expect(map.insight).toBeNull()
    expect(map.edges).toHaveLength(0)
    expect(map.statusMessage).toContain('3 voices')
  })
})

describe('DEMO_SYNTHESIS_MAP', () => {
  it('includes relationships and fourth idea', () => {
    expect(DEMO_SYNTHESIS_MAP.edges.length).toBeGreaterThanOrEqual(2)
    expect(DEMO_SYNTHESIS_MAP.insight?.statement).toBeTruthy()
  })
})
