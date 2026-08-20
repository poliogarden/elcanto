import { describe, expect, it } from 'vitest'
import { parsePlaylistId } from '@/lib/youtube/playlist-url'
import { buildTasteByWindow } from '@/lib/personal/taste-engine'
import type { PersonalSignal } from '@/lib/types/personal'

describe('playlist url parser', () => {
  it('parses raw playlist id', () => {
    expect(parsePlaylistId('PLrAXtmRdnEQy6nuLMH8k8')).toBe('PLrAXtmRdnEQy6nuLMH8k8')
  })

  it('parses watch url with list param', () => {
    expect(parsePlaylistId('https://www.youtube.com/watch?v=abc&list=PLtest123')).toBe('PLtest123')
  })
})

describe('buildTasteByWindow', () => {
  it('returns all four windows', () => {
    const signals: PersonalSignal[] = [
      {
        id: '1',
        source: 'youtube_like',
        title: 'AI agents',
        signalAt: new Date().toISOString(),
        topics: ['ai'],
        concepts: [],
      },
    ]

    const windows = buildTasteByWindow(signals)
    expect(windows['7d'].window).toBe('7d')
    expect(windows['30d'].window).toBe('30d')
    expect(windows['90d'].window).toBe('90d')
    expect(windows.all.window).toBe('all')
  })
})
