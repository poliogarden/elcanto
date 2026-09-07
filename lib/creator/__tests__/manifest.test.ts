import { describe, expect, it } from 'vitest'
import { buildCreatorRenderManifest } from '@/lib/creator/render/creator-render-manifest'
import type { VideoProject } from '@/lib/creator/types'

describe('creator-render-manifest', () => {
  it('builds v2 manifest from project scenes', () => {
    const project: VideoProject = {
      id: 'proj-1',
      channelId: 'ch-1',
      userId: 'u1',
      topic: 'AI Bubble',
      objective: 'Explain shift',
      stage: 'preview',
      status: 'ready',
      format: '16:9',
      research: null,
      angle: null,
      outline: null,
      script: { hook: 'test' },
      scenes: [
        {
          sceneId: 'sc1',
          order: 0,
          durationTargetSec: 6,
          scriptText: 'Intro',
          voiceText: 'Intro',
          visualIntent: 'Title card',
          visualType: 'kinetic_typography',
          captionText: 'Intro',
          transition: 'cut',
          voiceAssetId: 'voice_1',
        },
      ],
      visualAssets: [],
      renderJobs: [],
      renderVersions: [],
      linkedVideos: [],
      linkedPositionIds: [],
      decisions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const manifest = buildCreatorRenderManifest(project)
    expect(manifest.version).toBe(2)
    expect(manifest.width).toBe(1920)
    expect(manifest.scenes).toHaveLength(1)
    expect(manifest.scenes[0].voiceAudioUrl).toContain('/api/creator/assets/proj-1/voice_1.mp3')
  })
})
