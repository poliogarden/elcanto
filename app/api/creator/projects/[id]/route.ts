import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { getProjectForUser, updateProject } from '@/lib/creator/repository'
import { applyNaturalLanguageCommand } from '@/lib/creator/mutation/apply-mutation'
import { startCreatorRender } from '@/lib/creator/render/start-render'
import { appendProjectEvent } from '@/lib/creator/storage/local-store'
import { generatePublishPrep } from '@/lib/creator/pipeline/publish-prep'
import { buildCaptionsFromScenes, captionsToSrt } from '@/lib/creator/pipeline/caption-builder'
import { runFullVideoPipeline, buildShortsDerivative } from '@/lib/creator/pipeline/full-video-pipeline'
import { restoreArtifactVersion } from '@/lib/creator/project/decision-log'
import { detectContradictions } from '@/lib/creator/intelligence/context-retrieval'
import { loadBrain } from '@/lib/creator/storage/local-store'
import type { VideoProject } from '@/lib/creator/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const userId = await resolveCreatorUserId()
  const project = await getProjectForUser(id, userId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const userId = await resolveCreatorUserId()
  const body = (await request.json()) as Partial<VideoProject>
  const updated = await updateProject(id, userId, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ project: updated })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const userId = await resolveCreatorUserId()
  const project = await getProjectForUser(id, userId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json()) as {
    action: string
    command?: string
    draft?: boolean
    skipLlm?: boolean
    versionId?: string
  }

  if (body.action === 'ai') {
    const result = await applyNaturalLanguageCommand(project, body.command ?? '')
    await updateProject(id, userId, result.project)
    await appendProjectEvent(id, {
      type: 'ai_command',
      command: body.command,
      affectedSceneIds: result.affectedSceneIds,
    })
    return NextResponse.json({ project: result.project, message: result.message, mutationPreview: result.mutationPreview, undoVersionId: result.undoVersionId })
  }

  if (body.action === 'undo' && body.versionId) {
    const restored = await restoreArtifactVersion(id, body.versionId)
    if (!restored) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    return NextResponse.json({ project: restored })
  }

  if (body.action === 'contradictions') {
    const brain = await loadBrain(project.channelId)
    const alerts = brain ? detectContradictions(project, brain) : []
    return NextResponse.json({ alerts })
  }

  if (body.action === 'pipeline') {
    const updated = await runFullVideoPipeline(project, {
      skipLlm: body.skipLlm,
      draft: body.draft ?? true,
    })
    await updateProject(id, userId, updated)
    return NextResponse.json({ project: updated })
  }

  if (body.action === 'shorts') {
    const shorts = buildShortsDerivative(project)
    const ready = await runFullVideoPipeline(shorts, { skipLlm: true })
    return NextResponse.json({ project: ready })
  }

  if (body.action === 'render') {
    const versionLabel = `v${project.renderVersions.length + 1}`
    const job = await startCreatorRender({ project, versionLabel, draft: body.draft })
    const versions = [
      ...project.renderVersions,
      {
        id: job.id,
        label: versionLabel,
        renderJobId: job.id,
        outputUrl: job.outputUrl ?? null,
        createdAt: new Date().toISOString(),
      },
    ]
    const updated = await updateProject(id, userId, {
      status: 'rendering',
      renderJobs: [...project.renderJobs, job.id],
      renderVersions: versions,
    })
    await appendProjectEvent(id, { type: 'render_started', jobId: job.id })
    return NextResponse.json({ project: updated, job })
  }

  if (body.action === 'publish-prep') {
    const prep = await generatePublishPrep(project)
    const cues = buildCaptionsFromScenes(project.scenes)
    const updated = await updateProject(id, userId, {
      titles: prep.titles,
      description: prep.description,
      thumbnailConcepts: prep.thumbnailConcepts,
      captions: { cues, srt: captionsToSrt(cues) },
      stage: 'publish',
      publishing: { tags: prep.tags, preparedAt: new Date().toISOString() },
    })
    return NextResponse.json({ project: updated, prep })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
