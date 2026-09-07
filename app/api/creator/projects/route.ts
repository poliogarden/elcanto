import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { loadBrain, saveProject, appendProjectEvent } from '@/lib/creator/storage/local-store'
import { getChannelForUser } from '@/lib/creator/repository'
import type { VideoProject } from '@/lib/creator/types'
import {
  generateProjectResearch,
  generateProjectAngles,
  generateProjectOutline,
  generateProjectScript,
} from '@/lib/creator/pipeline/project-pipeline'
import { runFullVideoPipeline } from '@/lib/creator/pipeline/full-video-pipeline'
import { getOpenAIApiKey } from '@/lib/ai/config'

export async function POST(request: Request) {
  const userId = await resolveCreatorUserId()
  const body = (await request.json()) as {
    channelId: string
    opportunityId?: string
    title?: string
    thesis?: string
    autoGenerate?: boolean
    autoRender?: boolean
  }

  const channel = await getChannelForUser(body.channelId, userId)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const brain = await loadBrain(body.channelId)
  if (!brain) return NextResponse.json({ error: 'Channel Brain not ready' }, { status: 400 })

  const opportunity =
    brain.opportunities.find((o) => o.id === body.opportunityId) ?? brain.opportunities[0]
  if (!opportunity) return NextResponse.json({ error: 'No opportunity' }, { status: 400 })

  const now = new Date().toISOString()
  let project: VideoProject = {
    id: randomUUID(),
    channelId: body.channelId,
    userId,
    topic: body.title ?? opportunity.title,
    objective: body.thesis ?? opportunity.thesis,
    stage: 'research',
    status: 'draft',
    format: '16:9',
    research: null,
    angle: null,
    outline: null,
    script: null,
    scenes: [],
    visualAssets: [],
    renderJobs: [],
    renderVersions: [],
    linkedVideos: opportunity.linkedPositionIds.map(() => ''),
    linkedPositionIds: opportunity.linkedPositionIds,
    decisions: [],
    createdAt: now,
    updatedAt: now,
  }

  if (body.autoGenerate !== false) {
    const useLlm = Boolean(getOpenAIApiKey())
    if (useLlm) {
      project.research = await generateProjectResearch({ project, brain, opportunity, lang: 'ko' })
      project.stage = 'angle'
      const angles = await generateProjectAngles({ project, brain, opportunity, lang: 'ko' })
      const first = (angles as { angles?: Array<{ id: string; title: string; thesis: string }> })
        .angles?.[0]
      project.angle = first ?? { title: project.topic, thesis: project.objective }
      project.angles = (angles as { angles?: unknown[] }).angles
      project.outline = await generateProjectOutline({ project, lang: 'ko' })
      project.script = await generateProjectScript({ project, lang: 'ko' })
    }
    project = await runFullVideoPipeline(project, {
      skipLlm: !useLlm,
      lang: 'ko',
      autoRender: body.autoRender === true,
      draft: true,
    })
  }

  await saveProject(project)
  await appendProjectEvent(project.id, { type: 'project_created', topic: project.topic })

  return NextResponse.json({ project })
}
