import type { Scene, VisualAsset } from '@/lib/creator/types'

export type AssetPlan = {
  sceneId: string
  visualType: Scene['visualType']
  strategy: string
  costTier: VisualAsset['costTier']
  useExistingAsset: boolean
  generateImage: boolean
  generateVideo: boolean
  fallbackChain: Scene['visualType'][]
}

const COST_ORDER: Scene['visualType'][] = [
  'kinetic_typography',
  'color_background',
  'chart',
  'static_image',
  'generated_image',
  'b_roll',
  'channel_footage',
  'generated_video',
]

export function planSceneAssets(scene: Scene, existing?: VisualAsset): AssetPlan {
  let visualType = scene.visualType
  let costTier: VisualAsset['costTier'] = 'free'

  if (existing && existing.originType !== 'AI_GENERATED') {
    return {
      sceneId: scene.sceneId,
      visualType,
      strategy: 'reuse_existing_asset',
      costTier: 'free',
      useExistingAsset: true,
      generateImage: false,
      generateVideo: false,
      fallbackChain: [visualType],
    }
  }

  if (/chart|graph|data|비교|숫자/i.test(scene.visualIntent)) {
    visualType = 'chart'
    costTier = 'low'
  } else if (/typography|title|hook|인트로/i.test(scene.visualIntent)) {
    visualType = 'kinetic_typography'
    costTier = 'free'
  } else if (/footage|clip|영상/i.test(scene.visualIntent)) {
    visualType = 'channel_footage'
    costTier = 'free'
  } else if (/image|illustration|visual/i.test(scene.visualIntent)) {
    visualType = 'generated_image'
    costTier = 'medium'
  }

  const generateVideo = visualType === 'generated_video'
  const generateImage = visualType === 'generated_image' || visualType === 'static_image'

  return {
    sceneId: scene.sceneId,
    visualType,
    strategy: generateVideo ? 'generated_video' : generateImage ? 'generated_image' : visualType,
    costTier,
    useExistingAsset: false,
    generateImage,
    generateVideo,
    fallbackChain: buildFallbackChain(visualType),
  }
}

function buildFallbackChain(primary: Scene['visualType']): Scene['visualType'][] {
  const idx = COST_ORDER.indexOf(primary)
  if (idx === -1) return ['kinetic_typography', 'color_background']
  return COST_ORDER.slice(idx)
}

export function planAllSceneAssets(
  scenes: Scene[],
  assets: VisualAsset[],
): AssetPlan[] {
  return scenes.map((scene) => {
    const existing = assets.find((a) => a.sceneId === scene.sceneId)
    return planSceneAssets(scene, existing)
  })
}
