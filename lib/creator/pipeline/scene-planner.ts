import { z } from 'zod'
import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import type { Scene, VideoFormat } from '@/lib/creator/types'
import { VisualTypeSchema } from '@/lib/creator/types'

const ScenePlanSchema = z.object({
  scenes: z.array(
    z.object({
      sceneId: z.string(),
      order: z.number(),
      durationTargetSec: z.number(),
      scriptText: z.string(),
      voiceText: z.string(),
      visualIntent: z.string(),
      visualType: VisualTypeSchema,
      captionText: z.string(),
      transition: z.enum(['cut', 'fade']).default('cut'),
    }),
  ),
})

export async function planScenesFromScript(
  script: unknown,
  format: VideoFormat,
): Promise<Scene[]> {
  const openai = getOpenAIClient()
  const parsed = await callStructured({
    openai,
    role: 'analysis',
    operation: 'REASONING_SYNTHESIS',
    system: `Break script into scenes for video production.
Each scene needs visualIntent, visualType (prefer kinetic_typography, chart, static_image over generated_video).
Format: ${format}. Target 8-25 sec per scene.`,
    user: JSON.stringify(script, null, 2),
    schema: ScenePlanSchema,
    schemaName: 'creator_scene_plan',
    maxOutputTokens: 4000,
  })

  return parsed.scenes.map((s) => ({
    ...s,
    visualAssetId: null,
    voiceAssetId: null,
    sceneRenderPath: null,
  }))
}

export function shortenScene(scene: Scene, factor = 0.5): Scene {
  const words = scene.scriptText.split(/\s+/)
  const cut = Math.max(8, Math.floor(words.length * factor))
  const shortened = words.slice(0, cut).join(' ')
  return {
    ...scene,
    scriptText: shortened,
    voiceText: shortened,
    captionText: shortened,
    durationTargetSec: Math.max(5, Math.round(scene.durationTargetSec * factor)),
  }
}

export function findSceneByTimestampHint(
  scenes: Scene[],
  hint: string,
): Scene | undefined {
  const match = hint.match(/(\d+)\s*분\s*(\d+)?/)
  if (match) {
    const min = Number(match[1])
    const sec = Number(match[2] ?? 0)
    const target = min * 60 + sec
    let acc = 0
    for (const scene of scenes) {
      acc += scene.durationTargetSec
      if (acc >= target) return scene
    }
  }
  const num = hint.match(/scene\s*(\d+)|장면\s*(\d+)/i)
  if (num) {
    const order = Number(num[1] ?? num[2]) - 1
    return scenes.find((s) => s.order === order)
  }
  return scenes[0]
}
