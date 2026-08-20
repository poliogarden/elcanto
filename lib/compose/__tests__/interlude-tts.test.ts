import { describe, expect, it } from 'vitest'
import { estimateSpeechDuration } from '@/lib/compose/interlude-tts'

describe('estimateSpeechDuration', () => {
  it('returns at least 3 seconds', () => {
    expect(estimateSpeechDuration('hi')).toBeGreaterThanOrEqual(3)
  })

  it('scales with word count', () => {
    const short = estimateSpeechDuration('one two')
    const long = estimateSpeechDuration('one two three four five six seven eight nine ten eleven twelve')
    expect(long).toBeGreaterThan(short)
  })
})
