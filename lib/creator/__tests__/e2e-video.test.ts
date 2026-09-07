import { describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { runFullVideoPipeline } from '@/lib/creator/pipeline/full-video-pipeline'
import { applyNaturalLanguageCommand } from '@/lib/creator/mutation/apply-mutation'
import { buildCreatorRenderManifest } from '@/lib/creator/render/creator-render-manifest'
import { saveProject, loadProject } from '@/lib/creator/storage/local-store'
import { buildDemoScenes, buildDemoScript } from '@/lib/creator/sample/demo-project'
import { DEMO_CHANNEL_ID } from '@/lib/creator/config'
import type { VideoProject } from '@/lib/creator/types'
import { pollCreatorRenderStatus, startCreatorRender } from '@/lib/creator/render/start-render'
import { validateRenderWithFfprobe } from '@/lib/creator/render/validate-render'
import path from 'path'
import { access } from 'fs/promises'

function baseProject(): VideoProject {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    channelId: DEMO_CHANNEL_ID,
    userId: 'demo-creator-user',
    topic: 'AI 버블, 정말 끝났을까?',
    objective: 'Bubble shape change thesis',
    stage: 'research',
    status: 'draft',
    format: '16:9',
    research: { summary: 'demo' },
    angle: { title: 'Shape change', thesis: 'Not simple end' },
    outline: { sections: [] },
    script: buildDemoScript('AI 버블'),
    scenes: [],
    visualAssets: [],
    renderJobs: [],
    renderVersions: [],
    linkedVideos: [],
    linkedPositionIds: [],
    linkedClaims: [],
    decisions: [],
    createdAt: now,
    updatedAt: now,
  }
}

describe('creator video e2e', () => {
  it('runs full pipeline: scenes → voice → captions → timeline → manifest', async () => {
    let project = await runFullVideoPipeline(baseProject(), { skipLlm: true })
    expect(project.scenes.length).toBeGreaterThanOrEqual(3)
    expect(project.timeline?.duration).toBeGreaterThan(0)
    expect((project.captions as { srt?: string })?.srt).toContain('-->')
    expect(project.generationCost?.ttsWords).toBeGreaterThan(0)

    const manifest = buildCreatorRenderManifest(project)
    expect(manifest.scenes.length).toBe(project.scenes.length)
    expect(manifest.version).toBe(2)
  })

  it('NL edit shortens intro and only marks affected scene dirty', async () => {
    let project = await runFullVideoPipeline(baseProject(), { skipLlm: true })
    await saveProject(project)
    const introBefore = project.scenes.find((s) => s.order === 0)!
    const result = await applyNaturalLanguageCommand(project, '인트로를 절반으로 줄여줘')
    const introAfter = result.project.scenes.find((s) => s.order === 0)!
    expect(introAfter.scriptText.length).toBeLessThan(introBefore.scriptText.length)
    expect(result.affectedSceneIds?.length).toBe(1)
  })

  it('persists project state across save/load', async () => {
    const project = await runFullVideoPipeline(baseProject(), { skipLlm: true })
    await saveProject(project)
    const loaded = await loadProject(project.id)
    expect(loaded?.scenes.length).toBe(project.scenes.length)
    expect(loaded?.timeline?.duration).toBe(project.timeline?.duration)
  })

  it('renders real MP4 when worker is available', async () => {
    const workerUrl = process.env.LOCAL_RENDER_WORKER_URL ?? 'http://localhost:8788'
    let healthOk = false
    try {
      const res = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(2000) })
      healthOk = res.ok
    } catch {
      healthOk = false
    }

    if (!healthOk) {
      console.warn('[e2e] render worker not running — skipping live MP4 render')
      return
    }

    let project = await runFullVideoPipeline(baseProject(), { skipLlm: true })
    const job = await startCreatorRender({ project, versionLabel: 'v1-e2e', draft: true })
    let outputUrl: string | null = null
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const status = await pollCreatorRenderStatus(job.id)
      if (status?.status === 'READY' && status.outputUrl) {
        outputUrl = status.outputUrl
        break
      }
      if (status?.status === 'FAILED') break
    }

    expect(outputUrl).toBeTruthy()
    if (!outputUrl) return

    if (outputUrl.startsWith('/files/')) {
      const parts = outputUrl.split('/')
      const filePath = path.join(process.cwd(), 'render-out', parts[2], 'out', parts[3])
      const exists = await access(filePath).then(() => true).catch(() => false)
      if (exists) {
        const report = await validateRenderWithFfprobe(filePath)
        expect(report.hasVideo).toBe(true)
        expect(report.durationSec).toBeGreaterThan(0)
      }
    }
  }, 180_000)
})
