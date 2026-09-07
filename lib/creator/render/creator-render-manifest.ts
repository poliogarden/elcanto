import type { Scene, VideoProject, VisualAsset } from '@/lib/creator/types'
import { findAssetForScene } from '@/lib/creator/storage/asset-library'

export type CreatorRenderScene = {
  id: string
  order: number
  durationSeconds: number
  visualType: string
  visualIntent: string
  captionText: string
  scriptText: string
  voiceAudioUrl?: string
  imageUrl?: string
}

export type CreatorRenderManifest = {
  version: 2
  projectId: string
  title: string
  format: '16:9' | '9:16'
  width: number
  height: number
  scenes: CreatorRenderScene[]
  backgroundMusicVolume: number
  backgroundMusicAssetId?: string
}

export function buildCreatorRenderManifest(project: VideoProject): CreatorRenderManifest {
  const isVertical = project.format === '9:16'
  const assets = project.visualAssets as VisualAsset[]
  const bgm = project.backgroundMusic as { assetId?: string; volume?: number } | null
  return {
    version: 2,
    projectId: project.id,
    title: project.topic,
    format: project.format,
    width: isVertical ? 1080 : 1920,
    height: isVertical ? 1920 : 1080,
    scenes: project.scenes
      .sort((a, b) => a.order - b.order)
      .map((s) => sceneToRenderScene(s, project.id, assets)),
    backgroundMusicVolume: bgm?.volume ?? 0.15,
    backgroundMusicAssetId: bgm?.assetId,
  }
}

function sceneToRenderScene(scene: Scene, projectId: string, assets: VisualAsset[]): CreatorRenderScene {
  const voiceUrl = scene.voiceAssetId
    ? `/api/creator/assets/${projectId}/${scene.voiceAssetId}.mp3`
    : undefined

  const asset = scene.visualAssetId
    ? findAssetForScene(assets, scene.sceneId) ?? assets.find((a) => a.id === scene.visualAssetId)
    : undefined

  const remoteUrl = scene.metadata?.remoteImageUrl as string | undefined
  const imageUrl =
    remoteUrl ??
    (asset?.publicUrl.startsWith('http')
      ? asset.publicUrl
      : asset
        ? `/api/creator/assets/${projectId}/${asset.fileName}`
        : undefined)

  return {
    id: scene.sceneId,
    order: scene.order,
    durationSeconds: Math.max(3, scene.durationTargetSec),
    visualType: scene.visualType,
    visualIntent: scene.visualIntent,
    captionText: scene.captionText || scene.scriptText,
    scriptText: scene.scriptText,
    voiceAudioUrl: voiceUrl,
    imageUrl,
  }
}
