import type { Scene, VideoProject } from '@/lib/creator/types'
import { registerProjectAsset, mergeVisualAssets } from '@/lib/creator/storage/asset-library'
import { planAllSceneAssets, type AssetPlan } from '@/lib/creator/pipeline/asset-planner'
import { getImageGenerationProvider } from '@/lib/creator/providers/image-generation'

export function buildChartSvg(title: string, values: number[] = [40, 65, 52, 88, 71]): string {
  const bars = values
    .map((v, i) => {
      const x = 80 + i * 90
      const h = v * 3
      return `<rect x="${x}" y="${320 - h}" width="60" height="${h}" fill="#c45c4a" rx="4"/>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#1a1a2e"/>
  <text x="40" y="40" fill="#e8e6e3" font-size="22" font-family="sans-serif">${escapeXml(title.slice(0, 48))}</text>
  ${bars}
</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildPlaceholderSvg(intent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#2d2d44"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <text x="80" y="360" fill="#e8e6e3" font-size="36" font-family="sans-serif">${escapeXml(intent.slice(0, 80))}</text>
</svg>`
}

async function resolvePlan(
  project: VideoProject,
  scene: Scene,
  plan: AssetPlan,
): Promise<{ scene: Scene; asset?: Awaited<ReturnType<typeof registerProjectAsset>> }> {
  let nextScene: Scene = { ...scene, visualType: plan.visualType }

  for (const strategy of plan.fallbackChain) {
    try {
      if (strategy === 'chart') {
        const fileName = `chart_${scene.sceneId}.svg`
        const asset = await registerProjectAsset({
          projectId: project.id,
          sceneId: scene.sceneId,
          fileName,
          contents: buildChartSvg(scene.visualIntent),
          mimeType: 'image/svg+xml',
          originType: 'SYSTEM_GENERATED',
          provider: 'svg-chart',
          costTier: 'low',
        })
        nextScene = { ...nextScene, visualType: 'chart', visualAssetId: asset.id }
        return { scene: nextScene, asset }
      }

      if (strategy === 'generated_image') {
        const provider = getImageGenerationProvider()
        if (provider) {
          const result = await provider.generate({
            prompt: `${scene.visualIntent}. Context: ${scene.scriptText.slice(0, 200)}`,
            width: project.format === '9:16' ? 1024 : 1792,
            height: project.format === '9:16' ? 1792 : 1024,
          })
          if (result.url.startsWith('http')) {
            nextScene = {
              ...nextScene,
              visualType: 'generated_image',
              visualAssetId: result.assetId,
              metadata: { ...nextScene.metadata, remoteImageUrl: result.url },
            }
            return {
              scene: nextScene,
              asset: {
                id: result.assetId,
                projectId: project.id,
                sceneId: scene.sceneId,
                originType: 'AI_GENERATED',
                mimeType: 'image/png',
                fileName: `${result.assetId}.png`,
                publicUrl: result.url,
                provider: result.provider,
                costTier: 'medium',
                prompt: scene.visualIntent,
                createdAt: new Date().toISOString(),
              },
            }
          }
        }
      }

      if (strategy === 'static_image' || strategy === 'generated_image') {
        const fileName = `visual_${scene.sceneId}.svg`
        const asset = await registerProjectAsset({
          projectId: project.id,
          sceneId: scene.sceneId,
          fileName,
          contents: buildPlaceholderSvg(scene.visualIntent),
          mimeType: 'image/svg+xml',
          originType: 'SYSTEM_GENERATED',
          provider: 'placeholder-svg',
          costTier: 'free',
          prompt: scene.visualIntent,
        })
        nextScene = { ...nextScene, visualType: 'static_image', visualAssetId: asset.id }
        return { scene: nextScene, asset }
      }

      if (strategy === 'kinetic_typography' || strategy === 'color_background') {
        nextScene = { ...nextScene, visualType: strategy, visualAssetId: null }
        return { scene: nextScene }
      }
    } catch {
      continue
    }
  }

  nextScene = { ...nextScene, visualType: 'kinetic_typography', visualAssetId: null }
  return { scene: nextScene }
}

export async function resolveSceneVisuals(project: VideoProject): Promise<VideoProject> {
  const plans = planAllSceneAssets(project.scenes, project.visualAssets as import('@/lib/creator/types').VisualAsset[])
  const assets: import('@/lib/creator/types').VisualAsset[] = []
  const scenes: Scene[] = []

  for (const scene of project.scenes) {
    const plan = plans.find((p) => p.sceneId === scene.sceneId)!
    const result = await resolvePlan(project, scene, plan)
    scenes.push(result.scene)
    if (result.asset) assets.push(result.asset)
  }

  return {
    ...project,
    scenes,
    visualAssets: mergeVisualAssets(project.visualAssets as import('@/lib/creator/types').VisualAsset[], assets),
    updatedAt: new Date().toISOString(),
  }
}
