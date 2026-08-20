import type { CompositionDocument, RenderJob } from '@/lib/types/composition'

const COMPOSE_PREFIX = 'elcanto-compose-'
const RENDER_PREFIX = 'elcanto-render-'

export function saveCompositionDocument(doc: CompositionDocument): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(doc)
  sessionStorage.setItem(`${COMPOSE_PREFIX}${doc.id}`, payload)
  localStorage.setItem(`${COMPOSE_PREFIX}${doc.id}`, payload)
}

export function loadCompositionDocument(id: string): CompositionDocument | null {
  if (typeof window === 'undefined') return null
  const raw =
    sessionStorage.getItem(`${COMPOSE_PREFIX}${id}`) ??
    localStorage.getItem(`${COMPOSE_PREFIX}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompositionDocument
  } catch {
    return null
  }
}

export function saveRenderJob(job: RenderJob): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${RENDER_PREFIX}${job.id}`, JSON.stringify(job))
}

export function loadRenderJob(id: string): RenderJob | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(`${RENDER_PREFIX}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RenderJob
  } catch {
    return null
  }
}
