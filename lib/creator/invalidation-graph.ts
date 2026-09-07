import type { VideoProject } from '@/lib/creator/types'

/** Dependency: source artifact → downstream artifacts invalidated on change */
const INVALIDATION: Record<string, string[]> = {
  research: ['angle', 'outline', 'script', 'scenes', 'voiceTrack', 'captions', 'timeline', 'render'],
  angle: ['outline', 'script', 'scenes', 'voiceTrack', 'captions', 'timeline', 'render'],
  outline: ['script', 'scenes', 'voiceTrack', 'captions', 'timeline', 'render'],
  script: ['scenes', 'voiceTrack', 'captions', 'timeline', 'render'],
  scenes: ['voiceTrack', 'captions', 'timeline', 'render'],
  scene: ['voiceTrack', 'captions', 'timeline', 'render'],
  voiceTrack: ['captions', 'timeline', 'render'],
  captions: ['timeline', 'render'],
  timeline: ['render'],
  thumbnail: [],
  titles: [],
  description: [],
  backgroundMusic: ['timeline', 'render'],
}

export function artifactsInvalidatedBy(change: string): string[] {
  if (change.startsWith('scene[')) return INVALIDATION.scene ?? []
  return INVALIDATION[change] ?? []
}

export function markProjectInvalidation(
  project: VideoProject,
  changedArtifact: string,
): Record<string, boolean> {
  const next = { ...(project.invalidation ?? {}) }
  for (const key of artifactsInvalidatedBy(changedArtifact)) {
    next[key] = true
  }
  return next
}

export function markSceneInvalidation(
  project: VideoProject,
  sceneOrder: number,
): Record<string, boolean> {
  const next = { ...(project.invalidation ?? {}) }
  next[`scene[${sceneOrder}]`] = true
  for (const key of ['voiceTrack', 'captions', 'timeline', 'render']) {
    next[key] = true
  }
  return next
}

export function scenesNeedingRerender(project: VideoProject): number[] {
  const inv = project.invalidation ?? {}
  const orders: number[] = []
  for (const key of Object.keys(inv)) {
    const m = key.match(/^scene\[(\d+)\]$/)
    if (m) orders.push(Number(m[1]))
  }
  if (orders.length === 0 && inv.render) {
    return project.scenes.map((s) => s.order)
  }
  return orders
}

export function clearInvalidation(
  project: VideoProject,
  artifact: string,
): Record<string, boolean> {
  const next = { ...(project.invalidation ?? {}) }
  delete next[artifact]
  for (const downstream of artifactsInvalidatedBy(artifact)) {
    delete next[downstream]
  }
  return next
}
