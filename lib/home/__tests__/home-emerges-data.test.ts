import { describe, expect, it } from 'vitest'
import { resolveHomeEmerges } from '@/lib/home/home-emerges-data'
import type { Voice } from '@/lib/types/voice'

function voice(n: number, youtubeId: string, title: string): Voice {
  return {
    id: `v${n}`,
    n,
    youtubeId,
    url: `https://youtube.com/watch?v=${youtubeId}`,
    title,
    channel: 'Channel',
    duration: '10:00',
    status: 'ready',
  }
}

describe('resolveHomeEmerges', () => {
  it('shows demo sample when no voices selected', () => {
    const data = resolveHomeEmerges([])
    expect(data.mode).toBe('demo')
    expect(data.isSample).toBe(true)
    expect(data.headline).toBeTruthy()
    expect(data.relationships.length).toBeGreaterThan(0)
  })

  it('does not fake insight for selected but unsynthesized voices', () => {
    const data = resolveHomeEmerges([
      voice(1, 'abc12345678', 'A'),
      voice(2, 'def12345678', 'B'),
      voice(3, 'ghi12345678', 'C'),
    ])
    expect(data.mode).toBe('awaiting')
    expect(data.headline).toBeUndefined()
    expect(data.relationships).toHaveLength(0)
    expect(data.statusMessage).toContain('Run synthesis')
  })

  it('asks for two videos when only one is selected', () => {
    const data = resolveHomeEmerges([voice(1, 'abc12345678', 'A')])
    expect(data.mode).toBe('awaiting')
    expect(data.statusMessage).toContain('at least two')
  })
})
