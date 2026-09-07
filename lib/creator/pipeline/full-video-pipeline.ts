import { randomUUID } from 'crypto'
import type { ChannelBrain, ContentOpportunity, Scene, VideoProject } from '@/lib/creator/types'
import { clearInvalidation } from '@/lib/creator/invalidation-graph'
import { buildCaptionsFromScenes, captionsToSrt, captionsToVtt } from '@/lib/creator/pipeline/caption-builder'
import { applyDefaultBackgroundMusic } from '@/lib/creator/pipeline/music-layer'
import { estimateProjectCost } from '@/lib/creator/pipeline/cost-estimation'
import { resolveSceneVisuals } from '@/lib/creator/pipeline/visual-resolver'
import { buildTimelineFromScenes } from '@/lib/creator/pipeline/timeline-builder'
import { planScenesFromScript } from '@/lib/creator/pipeline/scene-planner'
import {
  advanceProjectPipeline,
  regenerateAllSceneVoices,
  regenerateSceneVoice,
} from '@/lib/creator/pipeline/project-pipeline'
import { generatePublishPrep } from '@/lib/creator/pipeline/publish-prep'
import { resolveVoiceProfile } from '@/lib/creator/providers/voice-profile'
import { startCreatorRender } from '@/lib/creator/render/start-render'
import { buildDemoScenes, buildDemoScript } from '@/lib/creator/sample/demo-project'

export type FullPipelineOptions = {
  lang?: 'ko' | 'en'
  skipLlm?: boolean
  autoRender?: boolean
  draft?: boolean
  brain?: ChannelBrain
  opportunity?: ContentOpportunity
}

export async function runFullVideoPipeline(
  project: VideoProject,
  options: FullPipelineOptions = {},
): Promise<VideoProject> {
  let next = { ...project, status: 'generating' as const }
  const profile = resolveVoiceProfile(next.voiceProfileId)
  next.voiceProfileId = profile.id

  if (options.skipLlm) {
    next.script = next.script ?? buildDemoScript(next.topic)
    next.scenes = next.scenes.length > 0 ? next.scenes : buildDemoScenes(next.topic)
    next.stage = 'scenes'
  } else if (next.scenes.length === 0 && next.script) {
    next.scenes = await planScenesFromScript(next.script, next.format)
    next.stage = 'scenes'
    next.invalidation = clearInvalidation(next, 'scenes')
  } else if (!next.timeline) {
    next = await advanceProjectPipeline(next)
  }

  next = await resolveSceneVisuals(next)
  next = await regenerateAllSceneVoices(next)

  const cues = buildCaptionsFromScenes(next.scenes)
  next.captions = { cues, srt: captionsToSrt(cues), vtt: captionsToVtt(cues) }
  next.invalidation = clearInvalidation(next, 'captions')

  next = applyDefaultBackgroundMusic(next)
  next.timeline = buildTimelineFromScenes(next.scenes, next.format, next.backgroundMusic)
  next.invalidation = clearInvalidation(next, 'timeline')

  next.generationCost = estimateProjectCost(next)
  next.status = 'ready'
  next.stage = 'preview'
  next.updatedAt = new Date().toISOString()

  if (!options.skipLlm && !next.titles?.length) {
    try {
      const prep = await generatePublishPrep(next)
      next.titles = prep.titles
      next.description = prep.description
      next.thumbnailConcepts = prep.thumbnailConcepts
      next.publishing = { tags: prep.tags, preparedAt: new Date().toISOString() }
    } catch {
      // publish prep is optional when LLM unavailable
    }
  }

  if (options.autoRender) {
    const versionLabel = `v${next.renderVersions.length + 1}`
    const job = await startCreatorRender({
      project: next,
      versionLabel,
      draft: options.draft ?? true,
    })
    next.renderJobs = [...next.renderJobs, job.id]
    next.renderVersions = [
      ...next.renderVersions,
      {
        id: job.id,
        label: versionLabel,
        renderJobId: job.id,
        outputUrl: null,
        createdAt: new Date().toISOString(),
      },
    ]
    next.status = 'rendering'
  }

  return next
}

export async function regenerateAffectedScenes(
  project: VideoProject,
  sceneIds: string[],
): Promise<VideoProject> {
  let current = project
  for (const sceneId of sceneIds) {
    const regen = await regenerateSceneVoice(current, sceneId)
    current = regen.project
  }
  current = await resolveSceneVisuals(current)
  const cues = buildCaptionsFromScenes(current.scenes)
  current.captions = { cues, srt: captionsToSrt(cues), vtt: captionsToVtt(cues) }
  current.timeline = buildTimelineFromScenes(current.scenes, current.format, current.backgroundMusic)
  current.generationCost = estimateProjectCost(current)
  current.updatedAt = new Date().toISOString()
  return current
}

export function buildShortsDerivative(project: VideoProject): VideoProject {
  const topScenes = [...project.scenes]
    .sort((a, b) => b.durationTargetSec - a.durationTargetSec)
    .slice(0, 3)
    .map((s, i) => ({ ...s, order: i, sceneId: `short_${s.sceneId}` }))

  return {
    ...project,
    id: randomUUID(),
    topic: `${project.topic} (Shorts)`,
    format: '9:16',
    scenes: topScenes,
    renderVersions: [],
    renderJobs: [],
    status: 'draft',
    stage: 'scenes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
