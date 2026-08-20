import { describe, expect, it } from 'vitest'
import { parsePasteInput } from '@/lib/youtube/parse-paste-input'

describe('parsePasteInput', () => {
  it('returns empty for blank input', () => {
    expect(parsePasteInput('')).toEqual({ kind: 'empty' })
  })

  it('detects single video URL', () => {
    const result = parsePasteInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({ kind: 'videos', videoIds: ['dQw4w9WgXcQ'] })
  })

  it('detects multiple video URLs', () => {
    const result = parsePasteInput(
      'https://youtu.be/dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=abcdefghijk',
    )
    expect(result.kind).toBe('videos')
    if (result.kind === 'videos') {
      expect(result.videoIds).toHaveLength(2)
    }
  })

  it('detects playlist URL', () => {
    const result = parsePasteInput('https://www.youtube.com/playlist?list=PLtest123')
    expect(result).toEqual({ kind: 'playlist', playlistId: 'PLtest123' })
  })
})
