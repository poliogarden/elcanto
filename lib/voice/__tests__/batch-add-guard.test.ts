import { describe, expect, it } from 'vitest'
import { validateBatchAdd } from '@/lib/voice/batch-add-guard'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

function item(videoId: string): VideoSourceItem {
  return {
    videoId,
    title: 'Test',
    channelTitle: 'Ch',
    sourceType: 'url',
  }
}

function voice(id: string, youtubeId: string): Voice {
  return {
    id,
    n: 1,
    youtubeId,
    url: `https://youtube.com/watch?v=${youtubeId}`,
    title: 'Test',
    channel: 'Ch',
    duration: '1:00',
    status: 'ready',
  }
}

describe('validateBatchAdd', () => {
  it('rejects when all items already selected', () => {
    const result = validateBatchAdd([item('abc')], [voice('1', 'abc')])
    expect(result.ok).toBe(false)
  })

  it('rejects batches larger than max', () => {
    const items = Array.from({ length: 25 }, (_, i) => item(`id${i}`))
    const result = validateBatchAdd(items, [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('batch_max')
      expect(result.max).toBe(20)
    }
  })

  it('allows valid batch', () => {
    const result = validateBatchAdd([item('new1'), item('new2')], [])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.items).toHaveLength(2)
  })
})
