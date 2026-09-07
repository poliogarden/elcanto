import { z } from 'zod'
import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import type { ChannelBrain, ContentOpportunity, Scene, VideoProject } from '@/lib/creator/types'
import { clearInvalidation, markProjectInvalidation } from '@/lib/creator/invalidation-graph'
import { synthesizeSceneSpeech } from '@/lib/creator/providers/tts'
import { buildTimelineFromScenes } from '@/lib/creator/pipeline/timeline-builder'
import { planScenesFromScript } from '@/lib/creator/pipeline/scene-planner'

const ResearchSchema = z.object({
  summary: z.string(),
  relevantEvidence: z.array(
    z.object({
      source: z.string(),
      text: z.string(),
      connection: z.string(),
    }),
  ),
  counterEvidence: z.array(z.string()).default([]),
})

const AngleSchema = z.object({
  angles: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      thesis: z.string(),
      whyFit: z.string(),
    }),
  ),
})

const OutlineSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
    }),
  ),
})

const ScriptSchema = z.object({
  hook: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
    }),
  ),
  conclusion: z.string(),
})

function brainContext(brain: ChannelBrain, opportunity: ContentOpportunity): string {
  return JSON.stringify(
    {
      opportunity,
      topics: brain.topics.slice(0, 6),
      positions: brain.positions.slice(0, 12),
      openLoops: brain.openLoops.slice(0, 6),
    },
    null,
    2,
  )
}

export async function generateProjectResearch(input: {
  project: VideoProject
  brain: ChannelBrain
  opportunity: ContentOpportunity
  lang?: 'ko' | 'en'
}): Promise<unknown> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.lang ?? 'ko')
  return callStructured({
    openai,
    role: 'analysis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}\nProduce research for a YouTube video. Focus on evidence and counter-evidence tied to creator positions.`,
    user: `Topic: ${input.project.topic}\nObjective: ${input.project.objective ?? 'Educate audience'}\n\nChannel context:\n${brainContext(input.brain, input.opportunity)}`,
    schema: ResearchSchema,
    schemaName: 'creator_research',
    maxOutputTokens: 3000,
  })
}

export async function generateProjectAngles(input: {
  project: VideoProject
  brain: ChannelBrain
  opportunity: ContentOpportunity
  lang?: 'ko' | 'en'
}): Promise<unknown> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.lang ?? 'ko')
  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}\nGenerate 3 distinct angles. Explain why each fits this channel brain.`,
    user: `Topic: ${input.project.topic}\nResearch:\n${JSON.stringify(input.project.research)}\n\nChannel:\n${brainContext(input.brain, input.opportunity)}`,
    schema: AngleSchema,
    schemaName: 'creator_angles',
    maxOutputTokens: 2500,
  })
}

export async function generateProjectOutline(input: {
  project: VideoProject
  lang?: 'ko' | 'en'
}): Promise<unknown> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.lang ?? 'ko')
  const angle = input.project.angle as { title?: string; thesis?: string } | null
  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}\nStructured outline for YouTube video.`,
    user: `Angle: ${angle?.title ?? input.project.topic}\nThesis: ${angle?.thesis ?? ''}\nResearch:\n${JSON.stringify(input.project.research)}`,
    schema: OutlineSchema,
    schemaName: 'creator_outline',
    maxOutputTokens: 2000,
  })
}

export async function generateProjectScript(input: {
  project: VideoProject
  lang?: 'ko' | 'en'
}): Promise<unknown> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.lang ?? 'ko')
  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}\nWrite spoken YouTube script with hook, sections, conclusion. Conversational but analytical.`,
    user: `Outline:\n${JSON.stringify(input.project.outline)}\nAngle:\n${JSON.stringify(input.project.angle)}`,
    schema: ScriptSchema,
    schemaName: 'creator_script',
    maxOutputTokens: 4000,
  })
}

export async function advanceProjectPipeline(project: VideoProject): Promise<VideoProject> {
  let next = { ...project, status: 'generating' as const }

  if (!next.research) {
    return { ...next, stage: 'research' }
  }
  if (!next.angle) {
    return { ...next, stage: 'angle' }
  }
  if (!next.outline) {
    return { ...next, stage: 'outline' }
  }
  if (!next.script) {
    return { ...next, stage: 'script' }
  }

  if (next.scenes.length === 0) {
    const scenes = await planScenesFromScript(next.script, next.format)
    next = {
      ...next,
      scenes,
      stage: 'scenes',
      invalidation: clearInvalidation(next, 'scenes'),
    }
  }

  if (!next.timeline) {
    next = {
      ...next,
      timeline: buildTimelineFromScenes(next.scenes, next.format),
      stage: 'timeline',
      invalidation: clearInvalidation(next, 'timeline'),
    }
  }

  return { ...next, status: 'ready', stage: 'preview' }
}

export async function regenerateSceneVoice(
  project: VideoProject,
  sceneId: string,
): Promise<{ project: VideoProject; scene: Scene }> {
  const scenes = [...project.scenes]
  const idx = scenes.findIndex((s) => s.sceneId === sceneId)
  if (idx === -1) throw new Error(`Scene ${sceneId} not found`)

  const scene = scenes[idx]
  const speech = await synthesizeSceneSpeech(scene.voiceText || scene.scriptText, project.id)
  scenes[idx] = {
    ...scene,
    voiceAssetId: speech.assetId,
    durationTargetSec: Math.min(scene.durationTargetSec, speech.durationSeconds),
  }

  const timeline = buildTimelineFromScenes(scenes, project.format)
  return {
    project: {
      ...project,
      scenes,
      timeline,
      invalidation: markProjectInvalidation(project, 'scene'),
      updatedAt: new Date().toISOString(),
    },
    scene: scenes[idx],
  }
}

export async function regenerateAllSceneVoices(project: VideoProject): Promise<VideoProject> {
  let current = project
  for (const scene of project.scenes) {
    const result = await regenerateSceneVoice(current, scene.sceneId)
    current = result.project
  }
  return current
}
