import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { getChannelForUser, saveProject } from '@/lib/creator/repository'
import { loadBrain, loadChannelMemory, loadOpportunityCache, appendProjectEvent } from '@/lib/creator/storage/local-store'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_USER_ID } from '@/lib/creator/config'
import { enrichOpportunities } from '@/lib/creator/intelligence/opportunity-engine'
import { runFullVideoPipeline } from '@/lib/creator/pipeline/full-video-pipeline'
import { getOpenAIApiKey } from '@/lib/ai/config'
import {
  generateProjectResearch,
  generateProjectAngles,
  generateProjectOutline,
  generateProjectScript,
} from '@/lib/creator/pipeline/project-pipeline'
import { recordDecision } from '@/lib/creator/project/decision-log'
import type { VideoProject } from '@/lib/creator/types'

export async function POST() {
  const userId = await resolveCreatorUserId()
  let channels = await import('@/lib/creator/repository').then((m) => m.listChannelsForUser(userId))
  if (channels.length === 0) {
    await seedDemoCreatorChannel()
    channels = await import('@/lib/creator/repository').then((m) => m.listChannelsForUser(DEMO_USER_ID))
  }
  const channel = channels[0]
  if (!channel) return NextResponse.json({ error: 'No channel' }, { status: 400 })

  const brain = await loadBrain(channel.id)
  const memory = await loadChannelMemory(channel.id)
  if (!brain) return NextResponse.json({ error: 'Brain not ready' }, { status: 400 })

  const rawOpps = (await loadOpportunityCache(channel.id)) ?? brain.opportunities
  const opportunities = memory
    ? enrichOpportunities(rawOpps, memory, brain.positions)
    : rawOpps
  const opportunity = opportunities[0]
  if (!opportunity) return NextResponse.json({ error: 'No opportunity' }, { status: 400 })

  const now = new Date().toISOString()
  let project: VideoProject = {
    id: randomUUID(),
    channelId: channel.id,
    userId,
    topic: opportunity.title,
    objective: opportunity.thesis,
    stage: 'research',
    status: 'generating',
    format: '16:9',
    research: null,
    angle: null,
    outline: null,
    script: null,
    scenes: [],
    visualAssets: [],
    renderJobs: [],
    renderVersions: [],
    linkedVideos: [],
    linkedPositionIds: opportunity.linkedPositionIds,
    linkedClaims: [],
    decisions: [],
    createdAt: now,
    updatedAt: now,
  }

  const useLlm = Boolean(getOpenAIApiKey())
  if (useLlm) {
    project.research = await generateProjectResearch({ project, brain, opportunity, lang: 'ko' })
    const angles = await generateProjectAngles({ project, brain, opportunity, lang: 'ko' })
    const first = (angles as { angles?: Array<{ id: string; title: string; thesis: string }> }).angles?.[0]
    project.angle = first ?? { title: project.topic, thesis: project.objective }
    project.outline = await generateProjectOutline({ project, lang: 'ko' })
    project.script = await generateProjectScript({ project, lang: 'ko' })
  }

  project = await runFullVideoPipeline(project, {
    skipLlm: !useLlm,
    autoRender: true,
    draft: true,
  })

  await saveProject(project)
  await recordDecision(project.id, {
    type: 'AUTO_VIDEO_STARTED',
    what: `Auto-generated video for: ${opportunity.title}`,
    why: opportunity.whyNow.join('; '),
    context: { opportunityId: opportunity.id, signals: opportunity },
    source: 'system',
  })
  await appendProjectEvent(project.id, { type: 'auto_video_created', opportunityId: opportunity.id })

  return NextResponse.json({ project, opportunity })
}
