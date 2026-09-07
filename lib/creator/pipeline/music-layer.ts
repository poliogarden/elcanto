import type { VideoProject } from '@/lib/creator/types'

export type BackgroundMusicConfig = {
  assetId: string
  volume: number
  fadeInSec: number
  fadeOutSec: number
  originType: 'SYSTEM_GENERATED' | 'USER_UPLOAD' | 'LICENSED_SOURCE'
  provider: string
  label: string
}

export function applyDefaultBackgroundMusic(project: VideoProject): VideoProject {
  const existing = project.backgroundMusic as BackgroundMusicConfig | null
  if (existing?.assetId) return project

  return {
    ...project,
    backgroundMusic: {
      assetId: 'bgm_system_ambient',
      volume: 0.12,
      fadeInSec: 2,
      fadeOutSec: 3,
      originType: 'SYSTEM_GENERATED',
      provider: 'lavfi-sine',
      label: 'Ambient system bed (no copyrighted music)',
    },
  }
}
