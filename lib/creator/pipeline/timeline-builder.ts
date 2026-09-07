import type { Scene, Timeline, VideoFormat } from '@/lib/creator/types'
import type { BackgroundMusicConfig } from '@/lib/creator/pipeline/music-layer'

export function buildTimelineFromScenes(
  scenes: Scene[],
  format: VideoFormat,
  backgroundMusic?: unknown,
): Timeline {
  const sorted = [...scenes].sort((a, b) => a.order - b.order)
  let cursor = 0
  const videoClips: Timeline['tracks'][0]['clips'] = []
  const voiceClips: Timeline['tracks'][0]['clips'] = []
  const captionClips: Timeline['tracks'][0]['clips'] = []
  const musicClips: Timeline['tracks'][0]['clips'] = []

  for (const scene of sorted) {
    const dur = scene.durationTargetSec
    const start = cursor
    const end = cursor + dur
    videoClips.push({
      id: `vid_${scene.sceneId}`,
      sceneId: scene.sceneId,
      startSec: start,
      endSec: end,
      assetId: scene.visualAssetId ?? undefined,
      label: scene.visualIntent,
    })
    if (scene.voiceAssetId) {
      voiceClips.push({
        id: `voice_${scene.sceneId}`,
        sceneId: scene.sceneId,
        startSec: start,
        endSec: end,
        assetId: scene.voiceAssetId,
        volume: 1,
      })
    }
    captionClips.push({
      id: `cap_${scene.sceneId}`,
      sceneId: scene.sceneId,
      startSec: start,
      endSec: end,
      label: scene.captionText,
    })
    cursor = end
  }

  const bgm = backgroundMusic as BackgroundMusicConfig | null | undefined
  if (bgm?.assetId && cursor > 0) {
    musicClips.push({
      id: `music_${bgm.assetId}`,
      startSec: 0,
      endSec: cursor,
      assetId: bgm.assetId,
      volume: bgm.volume ?? 0.12,
      label: bgm.label,
    })
  }

  return {
    duration: cursor,
    format,
    tracks: [
      { type: 'video', clips: videoClips },
      { type: 'voice', clips: voiceClips },
      { type: 'music', clips: musicClips },
      { type: 'caption', clips: captionClips },
    ],
  }
}
