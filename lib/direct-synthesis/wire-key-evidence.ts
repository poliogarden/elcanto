import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'

export type WiredKeyEvidence = {
  text: string
  startTime: number | null
  endTime: number | null
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\W+/g, ' ').trim()
}

function overlapRatio(a: string, b: string): number {
  const wordsA = normalizeForMatch(a).split(/\s+/).filter((w) => w.length > 2)
  const wordsB = normalizeForMatch(b).split(/\s+/).filter((w) => w.length > 2)
  if (wordsA.length === 0 || wordsB.length === 0) return 0

  const setB = new Set(wordsB)
  let shared = 0
  for (const word of wordsA) {
    if (setB.has(word)) shared++
  }
  return shared / Math.max(wordsA.length, wordsB.length)
}

function snippetToKeyEvidence(snippet: EvidenceSnippet): WiredKeyEvidence {
  return {
    text: snippet.text,
    startTime: snippet.startTime ?? null,
    endTime: snippet.endTime ?? null,
  }
}

function llmItemToKeyEvidence(
  item: { text: string; startTime?: number | null; endTime?: number | null },
): WiredKeyEvidence {
  return {
    text: item.text,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
  }
}

/**
 * Binds LLM-selected key evidence back to retrieved transcript snippets so
 * persisted/UI evidence uses original transcript text and segment timestamps.
 */
export function wireKeyEvidenceFromSnippets(
  llmItems: Array<{ text: string; startTime?: number | null; endTime?: number | null }>,
  snippets: EvidenceSnippet[],
  maxItems = 4,
): WiredKeyEvidence[] {
  if (snippets.length === 0) {
    return llmItems.map(llmItemToKeyEvidence)
  }

  const used = new Set<string>()
  const wired: WiredKeyEvidence[] = []
  const matchThreshold = 0.2

  for (const item of llmItems) {
    let best: EvidenceSnippet | null = null
    let bestScore = matchThreshold
    for (const snippet of snippets) {
      if (used.has(snippet.ref)) continue
      const score = overlapRatio(item.text, snippet.text)
      if (score > bestScore) {
        bestScore = score
        best = snippet
      }
    }
    if (best) {
      used.add(best.ref)
      wired.push(snippetToKeyEvidence(best))
    }
  }

  if (wired.length === 0) {
    return snippets.slice(0, maxItems).map(snippetToKeyEvidence)
  }

  return wired.slice(0, maxItems)
}
