import { describe, expect, it } from 'vitest'
import { buildCaptionsFromScenes, captionsToSrt } from '@/lib/creator/pipeline/caption-builder'
import type { Scene } from '@/lib/creator/types'

const scenes: Scene[] = [
  {
    sceneId: 's1',
    order: 0,
    durationTargetSec: 5,
    scriptText: 'Hello world',
    voiceText: 'Hello world',
    visualIntent: 'intro',
    visualType: 'kinetic_typography',
    captionText: 'Hello world',
    transition: 'cut',
  },
  {
    sceneId: 's2',
    order: 1,
    durationTargetSec: 8,
    scriptText: 'Second scene',
    voiceText: 'Second scene',
    visualIntent: 'body',
    visualType: 'chart',
    captionText: 'Second scene',
    transition: 'cut',
  },
]

describe('caption-builder', () => {
  it('builds sequential cues', () => {
    const cues = buildCaptionsFromScenes(scenes)
    expect(cues).toHaveLength(2)
    expect(cues[0].startSec).toBe(0)
    expect(cues[0].endSec).toBe(5)
    expect(cues[1].startSec).toBe(5)
    expect(cues[1].endSec).toBe(13)
  })

  it('exports valid SRT', () => {
    const srt = captionsToSrt(buildCaptionsFromScenes(scenes))
    expect(srt).toContain('00:00:00,000 --> 00:00:05,000')
    expect(srt).toContain('Hello world')
  })
})
