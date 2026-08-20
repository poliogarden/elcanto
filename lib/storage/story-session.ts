import type { StoryProject } from '@/lib/types/story-plan'

const STORY_PREFIX = 'elcanto-story-'

export function saveStoryProject(project: StoryProject): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(project)
  sessionStorage.setItem(`${STORY_PREFIX}${project.synthesisId}`, payload)
  localStorage.setItem(`${STORY_PREFIX}${project.synthesisId}`, payload)
}

export function loadStoryProject(synthesisId: string): StoryProject | null {
  if (typeof window === 'undefined') return null
  const raw =
    sessionStorage.getItem(`${STORY_PREFIX}${synthesisId}`) ??
    localStorage.getItem(`${STORY_PREFIX}${synthesisId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoryProject
  } catch {
    return null
  }
}
