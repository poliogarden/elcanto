import type { SourceAnalysis } from '@/lib/types/source'

export type EvidenceSnippet = {
  ref: string
  sourceId: string
  videoId: string
  text: string
  startTime?: number
  endTime?: number
}

const STOP = new Set([
  'what',
  'how',
  'why',
  'does',
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'are',
  'was',
  'were',
  'have',
  'has',
  'been',
  'really',
  'mean',
])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  let shared = 0
  for (const t of a) if (setB.has(t)) shared++
  return shared / Math.max(a.length, b.length)
}

/** Numeric anchors from question (e.g. 53, 53%) for cross-language retrieval. */
export function extractNumericAnchors(text: string): string[] {
  const anchors = new Set<string>()
  for (const m of text.matchAll(/(\d+)\s*%/g)) {
    anchors.add(m[1])
    anchors.add(`${m[1]}%`)
  }
  for (const m of text.matchAll(/\b(\d{2,})\b/g)) {
    anchors.add(m[1])
  }
  return [...anchors]
}

export function anchorMatchScore(question: string, evidenceText: string): number {
  const anchors = extractNumericAnchors(question)
  if (anchors.length === 0) return 0
  const evLower = evidenceText.toLowerCase()
  let hits = 0
  for (const anchor of anchors) {
    if (evLower.includes(anchor.toLowerCase())) hits++
  }
  return hits / anchors.length
}

export function retrieveQuestionFocusedEvidence(input: {
  centralQuestion: string
  source: SourceAnalysis
  maxSnippets?: number
}): EvidenceSnippet[] {
  const max = input.maxSnippets ?? 8
  const qTokens = tokens(input.centralQuestion)
  const questionAnchors = extractNumericAnchors(input.centralQuestion)

  const ranked = (input.source.evidence ?? [])
    .map((ev) => {
      const overlap = overlapScore(qTokens, tokens(ev.text))
      const anchor = anchorMatchScore(input.centralQuestion, ev.text)
      return {
        ref: `${input.source.sourceId}:${ev.id}`,
        sourceId: input.source.sourceId,
        videoId: input.source.videoId,
        text: ev.text,
        startTime: ev.timestamp,
        endTime: ev.endTime ?? undefined,
        score: overlap + anchor * 2,
        anchorHit: questionAnchors.length > 0 && anchor > 0,
      }
    })
    .sort((a, b) => b.score - a.score)

  const picked = new Set<string>()
  const result: EvidenceSnippet[] = []

  for (const row of ranked) {
    if (!row.anchorHit) continue
    if (picked.has(row.ref)) continue
    picked.add(row.ref)
    result.push({
      ref: row.ref,
      sourceId: row.sourceId,
      videoId: row.videoId,
      text: row.text,
      startTime: row.startTime,
      endTime: row.endTime,
    })
    if (result.length >= max) break
  }

  for (const row of ranked) {
    if (picked.has(row.ref)) continue
    picked.add(row.ref)
    result.push({
      ref: row.ref,
      sourceId: row.sourceId,
      videoId: row.videoId,
      text: row.text,
      startTime: row.startTime,
      endTime: row.endTime,
    })
    if (result.length >= max) break
  }

  return result
}

/** Top transcript snippets for synthesis comparison — not filtered by user question. */
export function retrieveSourceProfileEvidence(input: {
  source: SourceAnalysis
  maxSnippets?: number
}): EvidenceSnippet[] {
  const max = input.maxSnippets ?? 8
  const ranked = (input.source.evidence ?? [])
    .map((ev) => ({
      ref: `${input.source.sourceId}:${ev.id}`,
      sourceId: input.source.sourceId,
      videoId: input.source.videoId,
      text: ev.text,
      startTime: ev.timestamp,
      endTime: ev.endTime ?? undefined,
      score: ev.text.length,
    }))
    .sort((a, b) => b.score - a.score)

  return ranked.slice(0, max).map((row) => ({
    ref: row.ref,
    sourceId: row.sourceId,
    videoId: row.videoId,
    text: row.text,
    startTime: row.startTime,
    endTime: row.endTime,
  }))
}

export function buildEvidenceCatalog(sources: SourceAnalysis[]): EvidenceSnippet[] {
  const catalog: EvidenceSnippet[] = []
  const seenRefs = new Set<string>()
  for (const source of sources) {
    for (const ev of source.evidence ?? []) {
      const ref = `${source.sourceId}:${ev.id}`
      if (seenRefs.has(ref)) continue
      seenRefs.add(ref)
      catalog.push({
        ref,
        sourceId: source.sourceId,
        videoId: source.videoId,
        text: ev.text,
        startTime: ev.timestamp,
        endTime: ev.endTime ?? undefined,
      })
    }
  }
  return catalog
}

export function formatEvidenceForPrompt(refs: EvidenceSnippet[]): string {
  return refs
    .map((r) => `[${r.ref}] (${r.startTime ?? '?'}s) ${r.text.slice(0, 400)}`)
    .join('\n')
}
