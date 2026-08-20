import { describe, expect, it } from 'vitest'
import { computeClipBounds } from '@/lib/story/clip-bounds'

describe('computeClipBounds', () => {
  it('returns at least minimum duration', () => {
    const { sourceStart, sourceEnd } = computeClipBounds(100, 'Short quote.')
    expect(sourceEnd - sourceStart).toBeGreaterThanOrEqual(5)
  })

  it('caps at maximum duration', () => {
    const long = Array.from({ length: 80 }, () => 'word').join(' ')
    const { sourceStart, sourceEnd } = computeClipBounds(50, long)
    expect(sourceEnd - sourceStart).toBeLessThanOrEqual(20)
  })
})
