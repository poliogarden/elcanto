import type { DraftVoiceInput, SynthesisDocument } from '@/lib/types/synthesis-document'
import { getSynthesisTopic } from '@/lib/types/analysis'
import {
  normalizeSynthesisDraft,
  type SynthesisDraft,
} from '@/lib/types/synthesis-draft'
import { persistSynthesisDocument } from '@/lib/storage/synthesis-document-storage'
import {
  pruneOldestByCreatedAt,
  pruneStorageByPrefix,
  safeSetItem,
  setItemWithQuotaRecovery,
} from '@/lib/storage/storage-quota'

const DRAFT_PREFIX = 'elcanto-draft-'
const DOC_PREFIX = 'elcanto-synthesis-'
const JOB_PREFIX = 'elcanto-synthesis-job-'
const MAX_CACHED_DRAFTS = 8

/** Same-tab fallback when sessionStorage quota is exceeded. */
const memoryDrafts = new Map<string, SynthesisDraft>()

function slimDraftVoice(v: DraftVoiceInput): DraftVoiceInput {
  return {
    id: v.id,
    n: v.n,
    youtubeId: v.youtubeId,
    url: v.url,
    title: v.title.slice(0, 240),
    channel: v.channel.slice(0, 120),
    duration: v.duration?.slice(0, 32) ?? '—',
    durationSeconds: v.durationSeconds,
  }
}

function slimDraftPayload(draft: SynthesisDraft): SynthesisDraft {
  return {
    voices: draft.voices.map(slimDraftVoice),
    focusPreset: draft.focusPreset,
    mode: draft.mode,
    customPrompt: draft.customPrompt?.slice(0, 4000),
    outputLanguage: draft.outputLanguage,
  }
}

function pruneDraftStorage(storage: Storage, keepKey: string): void {
  pruneStorageByPrefix(storage, DRAFT_PREFIX, { keepKey, maxKeep: MAX_CACHED_DRAFTS })
}

export function saveDraft(id: string, draft: SynthesisDraft | DraftVoiceInput[]): boolean {
  if (typeof window === 'undefined') return false
  const payload = slimDraftPayload(
    Array.isArray(draft) ? { voices: draft } : draft,
  )
  memoryDrafts.set(id, payload)

  const session = window.sessionStorage
  const key = `${DRAFT_PREFIX}${id}`
  const serialized = JSON.stringify(payload)

  pruneDraftStorage(session, key)

  const sessionOk = setItemWithQuotaRecovery(
    session,
    key,
    serialized,
    () => {
      pruneDraftStorage(session, key)
      pruneStorageByPrefix(session, DRAFT_PREFIX, { keepKey: key, maxKeep: 2 })
    },
  )

  if (!sessionOk) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  return sessionOk || memoryDrafts.has(id)
}

export function loadDraft(id: string): SynthesisDraft | null {
  if (typeof window === 'undefined') return null

  const key = `${DRAFT_PREFIX}${id}`
  const raw =
    window.sessionStorage.getItem(key) ??
    (() => {
      try {
        return window.localStorage.getItem(key)
      } catch {
        return null
      }
    })()

  if (raw) {
    try {
      const parsed = normalizeSynthesisDraft(JSON.parse(raw))
      if (parsed) {
        memoryDrafts.set(id, parsed)
        return parsed
      }
    } catch {
      // fall through to memory
    }
  }

  return memoryDrafts.get(id) ?? null
}

export function clearDraft(id: string): void {
  memoryDrafts.delete(id)
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(`${DRAFT_PREFIX}${id}`)
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${id}`)
  } catch {
    // ignore
  }
}

export function saveSynthesisDocument(doc: SynthesisDocument): void {
  persistSynthesisDocument(`${DOC_PREFIX}${doc.id}`, doc)
}

export function loadSynthesisDocument(id: string): SynthesisDocument | null {
  if (typeof window === 'undefined') return null
  const raw =
    window.sessionStorage.getItem(`${DOC_PREFIX}${id}`) ??
    window.localStorage.getItem(`${DOC_PREFIX}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SynthesisDocument
  } catch {
    return null
  }
}

export type ArchiveEntry = {
  id: string
  number: string
  question: string
  voiceCount: number
  date: string
}

export function listLocalArchive(): ArchiveEntry[] {
  if (typeof window === 'undefined') return []
  const local = window.localStorage
  const entries: ArchiveEntry[] = []
  for (let i = 0; i < local.length; i++) {
    const key = local.key(i)
    if (!key?.startsWith(DOC_PREFIX)) continue
    const raw = local.getItem(key)
    if (!raw) continue
    try {
      const doc = JSON.parse(raw) as SynthesisDocument
      if (doc.status !== 'complete' || !doc.result) continue
      entries.push({
        id: doc.id,
        number: doc.number,
        question: getSynthesisTopic(doc.result),
        voiceCount: doc.voices.length,
        date: new Date(doc.createdAt)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          .toUpperCase(),
      })
    } catch {
      // skip
    }
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function markSavedToArchive(id: string): void {
  const doc = loadSynthesisDocument(id)
  if (!doc) return
  doc.savedToArchive = true
  saveSynthesisDocument(doc)
}

export function saveSynthesisJobId(synthesisId: string, jobId: string): void {
  if (typeof window === 'undefined') return
  const key = `${JOB_PREFIX}${synthesisId}`
  safeSetItem(window.sessionStorage, key, jobId)
  setItemWithQuotaRecovery(window.localStorage, key, jobId, () => {
    pruneOldestByCreatedAt(window.localStorage, DOC_PREFIX, 2)
    pruneStorageByPrefix(window.localStorage, JOB_PREFIX, { keepKey: key, maxKeep: 12 })
  })
}

export function loadSynthesisJobId(synthesisId: string): string | null {
  if (typeof window === 'undefined') return null
  return (
    window.sessionStorage.getItem(`${JOB_PREFIX}${synthesisId}`) ??
    window.localStorage.getItem(`${JOB_PREFIX}${synthesisId}`)
  )
}
