import type { DraftVoiceInput, SynthesisDocument } from '@/lib/types/synthesis-document'
import { getSynthesisTopic } from '@/lib/types/analysis'
import {
  normalizeSynthesisDraft,
  type SynthesisDraft,
} from '@/lib/types/synthesis-draft'

const DRAFT_PREFIX = 'elcanto-draft-'
const DOC_PREFIX = 'elcanto-synthesis-'
const JOB_PREFIX = 'elcanto-synthesis-job-'
const ARCHIVE_KEY = 'elcanto-archive'

export function saveDraft(id: string, draft: SynthesisDraft | DraftVoiceInput[]): void {
  if (typeof window === 'undefined') return
  const payload: SynthesisDraft = Array.isArray(draft) ? { voices: draft } : draft
  sessionStorage.setItem(`${DRAFT_PREFIX}${id}`, JSON.stringify(payload))
}

export function loadDraft(id: string): SynthesisDraft | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${id}`)
  if (!raw) return null
  try {
    return normalizeSynthesisDraft(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveSynthesisDocument(doc: SynthesisDocument): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(`${DOC_PREFIX}${doc.id}`, JSON.stringify(doc))
  localStorage.setItem(`${DOC_PREFIX}${doc.id}`, JSON.stringify(doc))
}

export function loadSynthesisDocument(id: string): SynthesisDocument | null {
  if (typeof window === 'undefined') return null
  const raw =
    sessionStorage.getItem(`${DOC_PREFIX}${id}`) ?? localStorage.getItem(`${DOC_PREFIX}${id}`)
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
  const entries: ArchiveEntry[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(DOC_PREFIX)) continue
    const raw = localStorage.getItem(key)
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
  sessionStorage.setItem(`${JOB_PREFIX}${synthesisId}`, jobId)
  localStorage.setItem(`${JOB_PREFIX}${synthesisId}`, jobId)
}

export function loadSynthesisJobId(synthesisId: string): string | null {
  if (typeof window === 'undefined') return null
  return (
    sessionStorage.getItem(`${JOB_PREFIX}${synthesisId}`) ??
    localStorage.getItem(`${JOB_PREFIX}${synthesisId}`)
  )
}
