import type { VideoProject } from '@/lib/creator/types'
import { markProjectInvalidation, markSceneInvalidation } from '@/lib/creator/invalidation-graph'
import { shortenScene, findSceneByTimestampHint } from '@/lib/creator/pipeline/scene-planner'
import { buildTimelineFromScenes } from '@/lib/creator/pipeline/timeline-builder'
import { regenerateAffectedScenes } from '@/lib/creator/pipeline/full-video-pipeline'
import { resolveSceneVisuals } from '@/lib/creator/pipeline/visual-resolver'
import { buildCaptionsFromScenes, captionsToSrt, captionsToVtt } from '@/lib/creator/pipeline/caption-builder'
import { recordDecision, snapshotArtifact } from '@/lib/creator/project/decision-log'
import { retrieveChannelContext } from '@/lib/creator/intelligence/context-retrieval'
import { loadBrain, loadChannelMemory } from '@/lib/creator/storage/local-store'

function refreshCaptionsAndTimeline(project: VideoProject): VideoProject {
  const cues = buildCaptionsFromScenes(project.scenes)
  return {
    ...project,
    captions: { cues, srt: captionsToSrt(cues), vtt: captionsToVtt(cues) },
    timeline: buildTimelineFromScenes(project.scenes, project.format, project.backgroundMusic),
    updatedAt: new Date().toISOString(),
  }
}

export async function applyNaturalLanguageCommand(
  project: VideoProject,
  command: string,
): Promise<{
  project: VideoProject
  message: string
  affectedSceneIds?: string[]
  mutationPreview?: string
  undoVersionId?: string
}> {
  const brain = await loadBrain(project.channelId)
  const memory = await loadChannelMemory(project.channelId)
  if (brain && memory && /지난|연결|전에 뭐라고|previous|connect/i.test(command)) {
    const ctx = retrieveChannelContext({ query: command, project, brain, memory })
    return {
      project,
      message: `관련 position: ${ctx.positions.map((p) => p.label).join(', ') || '없음'}. Open loops: ${ctx.openLoops.map((l) => l.label).join(', ')}`,
    }
  }

  if (/다른 주제|different topic/i.test(command)) {
    return { project, message: 'Ideas 페이지에서 다른 opportunity를 선택해 Start video를 눌러주세요.' }
  }

  if (/두 번째 아이디어|second idea/i.test(command)) {
    return { project, message: 'Ideas 페이지의 두 번째 opportunity로 새 프로젝트를 시작할 수 있습니다.' }
  }

  if (/반대|counter|반론/i.test(command)) {
    await snapshotArtifact(project.id, 'script', project.script, 'Before counter-argument')
    const script = project.script as { sections?: Array<{ body: string }> } | null
    if (script?.sections?.length) {
      script.sections[0].body += '\n\n반면, 일부 분석가들은 이 전제에 회의적입니다.'
    }
    const next = refreshCaptionsAndTimeline({ ...project, script })
    await recordDecision(project.id, { type: 'SCRIPT_DIRECTION_CHANGED', what: 'Added counter-argument', source: 'ai' })
    return { project: next, message: '반대 의견 섹션을 추가했습니다.', mutationPreview: 'Script: counter-argument appended' }
  }

  if (/최종 렌더|final render/i.test(command)) {
    return { project, message: 'Preview 탭에서 Final render 버튼을 사용하세요.', mutationPreview: 'Use render action' }
  }

  if (/shorts|쇼츠/i.test(command)) {
    return { project, message: 'Workspace에서 shorts action API를 호출하거나 Ideas에서 세로 포맷 프로젝트를 생성하세요.' }
  }

  if (/전체.*8분|8분으로/i.test(command)) {
    const targetSec = 8 * 60
    const current = project.scenes.reduce((s, sc) => s + sc.durationTargetSec, 0)
    const factor = targetSec / current
    const scenes = project.scenes.map((s) => shortenScene(s, factor))
    let next = refreshCaptionsAndTimeline({ ...project, scenes, invalidation: markProjectInvalidation(project, 'scene') })
    next = await regenerateAffectedScenes(next, scenes.map((s) => s.sceneId))
    await recordDecision(project.id, { type: 'DURATION_TARGET_CHANGED', what: 'Compressed to ~8 min', source: 'user' })
    return { project: next, message: '전체 길이를 약 8분으로 조정했습니다.' }
  }
  if (/인트로.*절반|intro.*half|shorten intro/i.test(command)) {
    const intro = project.scenes.find((s) => s.order === 0)
    if (!intro) return { project, message: '인트로 장면을 찾지 못했습니다.' }
    const shortened = shortenScene(intro, 0.5)
    await snapshotArtifact(project.id, 'scenes', project.scenes, 'Before intro shorten')
    let next: VideoProject = refreshCaptionsAndTimeline({
      ...project,
      scenes: project.scenes.map((s) => (s.order === 0 ? shortened : s)),
      invalidation: markSceneInvalidation(project, 0),
    })
    next = await regenerateAffectedScenes(next, [shortened.sceneId])
    const version = await snapshotArtifact(project.id, 'scenes', next.scenes, 'After intro shorten')
    await recordDecision(project.id, {
      type: 'SCENE_MODIFIED',
      what: `Intro ${intro.durationTargetSec}s → ${shortened.durationTargetSec}s`,
      why: command,
      source: 'user',
    })
    return {
      project: next,
      message: '인트로를 절반으로 줄이고 음성/타임라인을 재생성했습니다.',
      affectedSceneIds: [shortened.sceneId],
      mutationPreview: `Intro ${intro.durationTargetSec}s → ${shortened.durationTargetSec}s`,
      undoVersionId: version.id,
    }
  }

  if (/(\d+)\s*분\s*(\d+)?.*절반|(\d+):(\d+).*half/i.test(command)) {
    const scene = findSceneByTimestampHint(project.scenes, command)
    if (!scene) return { project, message: '해당 시간대 장면을 찾지 못했습니다.' }
    const shortened = shortenScene(scene, 0.5)
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes: project.scenes.map((s) => (s.sceneId === scene.sceneId ? shortened : s)),
      invalidation: markSceneInvalidation(project, scene.order),
    })
    next = await regenerateAffectedScenes(next, [scene.sceneId])
    return {
      project: next,
      message: `${scene.order + 1}번 장면을 절반으로 줄였습니다.`,
      affectedSceneIds: [scene.sceneId],
    }
  }

  if (/인트로.*(\d+)\s*초|intro.*(\d+)\s*sec/i.test(command)) {
    const m = command.match(/(\d+)\s*초|(\d+)\s*sec/i)
    const targetSec = Number(m?.[1] ?? m?.[2] ?? 12)
    const intro = project.scenes.find((s) => s.order === 0)
    if (!intro) return { project, message: '인트로 장면을 찾지 못했습니다.' }
    const factor = Math.min(1, targetSec / intro.durationTargetSec)
    const shortened = { ...shortenScene(intro, factor), durationTargetSec: targetSec }
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes: project.scenes.map((s) => (s.order === 0 ? shortened : s)),
      invalidation: markSceneInvalidation(project, 0),
    })
    next = await regenerateAffectedScenes(next, [shortened.sceneId])
    return { project: next, message: `인트로를 ${targetSec}초로 조정했습니다.`, affectedSceneIds: [shortened.sceneId] }
  }

  if (/장면\s*(\d+).*삭제|delete scene\s*(\d+)/i.test(command)) {
    const m = command.match(/장면\s*(\d+)|scene\s*(\d+)/i)
    const order = Number(m?.[1] ?? m?.[2]) - 1
    const scenes = project.scenes.filter((s) => s.order !== order)
    return {
      project: refreshCaptionsAndTimeline({
        ...project,
        scenes,
        invalidation: markProjectInvalidation(project, 'scene'),
      }),
      message: `장면 ${order + 1}을 삭제했습니다.`,
    }
  }

  if (/마지막.*(\d+)\s*초.*삭제|delete last\s*(\d+)/i.test(command)) {
    const m = command.match(/(\d+)\s*초|(\d+)\s*sec/i)
    const sec = Number(m?.[1] ?? m?.[2] ?? 20)
    const last = [...project.scenes].sort((a, b) => b.order - a.order)[0]
    if (!last) return { project, message: '삭제할 장면이 없습니다.' }
    if (last.durationTargetSec <= sec) {
      const scenes = project.scenes.filter((s) => s.sceneId !== last.sceneId)
      return {
        project: refreshCaptionsAndTimeline({
          ...project,
          scenes,
          invalidation: markProjectInvalidation(project, 'scene'),
        }),
        message: `마지막 장면을 삭제했습니다.`,
      }
    }
    const shortened = {
      ...last,
      durationTargetSec: Math.max(3, last.durationTargetSec - sec),
    }
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes: project.scenes.map((s) => (s.sceneId === last.sceneId ? shortened : s)),
      invalidation: markSceneInvalidation(project, last.order),
    })
    next = await regenerateAffectedScenes(next, [last.sceneId])
    return { project: next, message: `마지막 ${sec}초를 줄였습니다.`, affectedSceneIds: [last.sceneId] }
  }

  if (/차트|graph|chart/i.test(command) && /장면|scene/i.test(command)) {
    const m = command.match(/장면\s*(\d+)|scene\s*(\d+)/i)
    const order = Number(m?.[1] ?? m?.[2] ?? 3) - 1
    const scenes = project.scenes.map((s) =>
      s.order === order
        ? { ...s, visualType: 'chart' as const, visualIntent: 'Data chart visualization' }
        : s,
    )
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes,
      invalidation: markSceneInvalidation(project, order),
    })
    next = await resolveSceneVisuals(next)
    return { project: next, message: `${order + 1}번 장면을 차트 visual로 변경했습니다.` }
  }

  if (/역동|dynamic/i.test(command)) {
    const m = command.match(/장면\s*(\d+)|scene\s*(\d+)/i)
    const order = Number(m?.[1] ?? m?.[2] ?? 1) - 1
    const scenes = project.scenes.map((s) =>
      s.order === order
        ? { ...s, visualType: 'generated_image' as const, visualIntent: 'Dynamic motion graphic style' }
        : s,
    )
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes,
      invalidation: markSceneInvalidation(project, order),
    })
    next = await resolveSceneVisuals(next)
    return { project: next, message: `${order + 1}번 장면을 더 역동적인 visual로 변경했습니다.` }
  }

  if (/자막.*길|caption.*long/i.test(command)) {
    const scenes = project.scenes.map((s) => ({
      ...s,
      captionText: s.captionText.split(/\s+/).slice(0, 8).join(' '),
    }))
    return {
      project: refreshCaptionsAndTimeline({
        ...project,
        scenes,
        invalidation: markProjectInvalidation(project, 'captions'),
      }),
      message: '자막을 더 짧게 조정했습니다.',
    }
  }

  if (/bgm|배경\s*음악/i.test(command) && /줄|lower|작게/i.test(command)) {
    const bgm = (project.backgroundMusic as { volume?: number } | null) ?? {}
    return {
      project: refreshCaptionsAndTimeline({
        ...project,
        backgroundMusic: { ...bgm, volume: 0.08, note: 'Reduced per user request' },
        invalidation: markProjectInvalidation(project, 'backgroundMusic'),
      }),
      message: 'BGM 볼륨을 낮췄습니다.',
    }
  }

  if (/비판|critical/i.test(command)) {
    const scenes = project.scenes.map((s) => ({
      ...s,
      scriptText: s.scriptText.replace(/\.$/, ' — 하지만 이 전제는 검증이 필요합니다.'),
      voiceText: s.voiceText.replace(/\.$/, ' — 하지만 이 전제는 검증이 필요합니다.'),
    }))
    let next = refreshCaptionsAndTimeline({
      ...project,
      scenes,
      invalidation: markProjectInvalidation(project, 'scene'),
    })
    next = await regenerateAffectedScenes(next, scenes.map((s) => s.sceneId))
    return { project: next, message: '톤을 더 비판적으로 조정했습니다.' }
  }

  if (/(\d+)\s*번.*다시|remake scene\s*(\d+)/i.test(command)) {
    const m = command.match(/장면\s*(\d+)|scene\s*(\d+)|(\d+)\s*번/i)
    const order = Number(m?.[1] ?? m?.[2] ?? m?.[3]) - 1
    const scene = project.scenes.find((s) => s.order === order)
    if (!scene) return { project, message: '장면을 찾지 못했습니다.' }
    let next = await regenerateAffectedScenes(project, [scene.sceneId])
    next = await resolveSceneVisuals(next)
    return { project: next, message: `${order + 1}번 장면을 다시 생성했습니다.`, affectedSceneIds: [scene.sceneId] }
  }

  return { project, message: '요청을 이해했지만 해당 범위의 자동 수정 규칙이 없습니다.' }
}
