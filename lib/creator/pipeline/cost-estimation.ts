import type { Scene, VideoProject } from '@/lib/creator/types'
import type { GenerationCostEstimate } from '@/lib/creator/types'
import { planAllSceneAssets } from '@/lib/creator/pipeline/asset-planner'

export function estimateProjectCost(project: VideoProject): GenerationCostEstimate {
  const plans = planAllSceneAssets(
    project.scenes,
    project.visualAssets as import('@/lib/creator/types').VisualAsset[],
  )

  let generatedImages = 0
  let generatedVideos = 0
  let ttsWords = 0

  for (const scene of project.scenes) {
    ttsWords += (scene.voiceText || scene.scriptText).split(/\s+/).filter(Boolean).length
  }

  for (const plan of plans) {
    if (plan.generateImage) generatedImages += 1
    if (plan.generateVideo) generatedVideos += 1
  }

  const estimatedDurationSec = project.scenes.reduce((sum, s) => sum + s.durationTargetSec, 0)

  return {
    generatedImages,
    generatedVideos,
    ttsWords,
    estimatedDurationSec,
    sceneRenders: project.scenes.length,
  }
}

export function formatCostSummary(cost: GenerationCostEstimate): string {
  return [
    `${cost.generatedImages} generated images`,
    `${cost.generatedVideos} generated video clips`,
    `TTS ${cost.ttsWords} words`,
    `Render ~${Math.round(cost.estimatedDurationSec)}s`,
  ].join(' · ')
}
