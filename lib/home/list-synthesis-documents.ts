import { loadSynthesisDocument } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

const DOC_PREFIX = 'elcanto-synthesis-'

/** Lists completed synthesis documents from browser storage (client only). */
export function listCompleteSynthesisDocuments(): SynthesisDocument[] {
  if (typeof window === 'undefined') return []

  const ids = new Set<string>()
  for (const storage of [sessionStorage, localStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key?.startsWith(DOC_PREFIX)) continue
      ids.add(key.slice(DOC_PREFIX.length))
    }
  }

  const docs: SynthesisDocument[] = []
  for (const id of ids) {
    const doc = loadSynthesisDocument(id)
    if (doc?.status === 'complete' && doc.result) {
      docs.push(doc)
    }
  }

  return docs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
