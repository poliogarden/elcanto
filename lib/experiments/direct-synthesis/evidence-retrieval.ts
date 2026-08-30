import type { SourceAnalysis } from '@/lib/types/source'
import type { DirectEvidenceRef } from '@/lib/experiments/direct-synthesis/types'

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

export function buildEvidenceCatalog(sources: SourceAnalysis[]): DirectEvidenceRef[] {
  const catalog: DirectEvidenceRef[] = []
  for (const source of sources) {
    for (const ev of source.evidence ?? []) {
      catalog.push({
        ref: `${source.sourceId}:${ev.id}`,
        sourceId: source.sourceId,
        text: ev.text,
        startTime: ev.timestamp,
        endTime: ev.endTime ?? undefined,
      })
    }
  }
  return catalog
}

export function retrieveQuestionFocusedEvidence(input: {
  centralQuestion: string
  source: SourceAnalysis
  maxSnippets?: number
}): DirectEvidenceRef[] {
  const max = input.maxSnippets ?? 8
  const qTokens = tokens(input.centralQuestion)
  const ranked = (input.source.evidence ?? [])
    .map((ev) => ({
      ref: `${input.source.sourceId}:${ev.id}`,
      sourceId: input.source.sourceId,
      text: ev.text,
      startTime: ev.timestamp,
      endTime: ev.endTime ?? undefined,
      score: overlapScore(qTokens, tokens(ev.text)),
    }))
    .sort((a, b) => b.score - a.score)

  return ranked.slice(0, max).map(({ ref, sourceId, text, startTime, endTime }) => ({
    ref,
    sourceId,
    text,
    startTime,
    endTime,
  }))
}

export function formatEvidenceForPrompt(refs: DirectEvidenceRef[]): string {
  return refs
    .map(
      (r) =>
        `[${r.ref}] (${r.startTime ?? '?'}s) ${r.text.slice(0, 400)}`,
    )
    .join('\n')
}
