import { describe, expect, it } from 'vitest'
import {
  isValidYouTubeVideoId,
  normalizeChannelName,
  normalizeDraftVoice,
  normalizeVoiceForAnalyze,
} from '@/lib/voice/normalize-voice'

describe('normalize-voice', () => {
  it('rejects sample ids', () => {
    expect(isValidYouTubeVideoId('sample_1')).toBe(false)
  })

  it('accepts valid youtube id', () => {
    expect(isValidYouTubeVideoId('dQw4w9WgXcQ')).toBe(true)
  })

  it('defaults empty channel', () => {
    expect(normalizeChannelName('')).toBe('Unknown channel')
    expect(normalizeChannelName(undefined)).toBe('Unknown channel')
  })

  it('normalizes draft voice', () => {
    const v = normalizeDraftVoice({
      id: '1',
      n: 1,
      youtubeId: 'dQw4w9WgXcQ',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      title: '',
      channel: '',
      duration: '—',
    })
    expect(v?.title).toBe('Untitled video')
    expect(v?.channel).toBe('Unknown channel')
  })

  it('rejects invalid draft voice', () => {
    expect(
      normalizeDraftVoice({
        id: '1',
        n: 1,
        youtubeId: 'sample_1',
        url: '',
        title: 'x',
        channel: 'y',
        duration: '—',
      }),
    ).toBeNull()
  })

  it('normalizes voice for analyze', () => {
    const payload = normalizeVoiceForAnalyze({
      id: '1',
      n: 2,
      youtubeId: 'dQw4w9WgXcQ',
      url: '',
      title: 'Test',
      channel: '',
      duration: '—',
      status: 'ready',
    })
    expect(payload?.voiceIndex).toBe(2)
    expect(payload?.channel).toBe('Unknown channel')
  })
})
