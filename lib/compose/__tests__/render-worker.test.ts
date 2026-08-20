import { describe, expect, it } from 'vitest'
import { getRenderWorkerUrl, isRenderWorkerConfigured } from '@/lib/compose/render-worker-url'
import {
  buildYouTubeUploadDescription,
  buildYouTubeUploadTitle,
} from '@/lib/youtube/upload-video'
import type { RenderManifest } from '@/lib/compose/render-manifest'

describe('getRenderWorkerUrl', () => {
  it('prefers railway url over local', () => {
    const prevRailway = process.env.RAILWAY_RENDER_WORKER_URL
    const prevLocal = process.env.LOCAL_RENDER_WORKER_URL
    process.env.RAILWAY_RENDER_WORKER_URL = 'https://worker.example.com'
    process.env.LOCAL_RENDER_WORKER_URL = 'http://localhost:8788'
    expect(getRenderWorkerUrl()).toBe('https://worker.example.com')
    process.env.RAILWAY_RENDER_WORKER_URL = prevRailway
    process.env.LOCAL_RENDER_WORKER_URL = prevLocal
  })

  it('detects configured worker secret + url', () => {
    const prevUrl = process.env.RAILWAY_RENDER_WORKER_URL
    const prevSecret = process.env.WORKER_SECRET
    process.env.RAILWAY_RENDER_WORKER_URL = 'http://localhost:8788'
    process.env.WORKER_SECRET = 'secret'
    expect(isRenderWorkerConfigured()).toBe(true)
    process.env.RAILWAY_RENDER_WORKER_URL = prevUrl
    process.env.WORKER_SECRET = prevSecret
  })
})

describe('YouTube upload metadata', () => {
  const manifest: RenderManifest = {
    version: 1,
    compositionId: 'syn-1',
    title: 'Innovation thread',
    thesis: 'Startups need focus and timing.',
    totalDurationSeconds: 120,
    clips: [],
    interludes: [],
    attribution: [
      {
        youtubeId: 'abc',
        title: 'Video A',
        channel: 'Channel A',
        watchUrl: 'https://www.youtube.com/watch?v=abc',
      },
    ],
  }

  it('builds upload title and description with attribution', () => {
    expect(buildYouTubeUploadTitle(manifest)).toBe('Innovation thread')
    expect(buildYouTubeUploadDescription(manifest)).toContain('Video A')
    expect(buildYouTubeUploadDescription(manifest)).toContain('Channel A')
  })
})
