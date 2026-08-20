import type { SourceAnalysis } from '@/lib/types/source'
import type { StructuredClaim } from '@/lib/types/relationship'
import type { Evidence } from '@/lib/types/analysis'

function normalizeStatement(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(normalizeStatement(a).split(' ').filter((w) => w.length > 3))
  const wb = new Set(normalizeStatement(b).split(' ').filter((w) => w.length > 3))
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared += 1
  return shared / Math.max(wa.size, wb.size)
}

function deduplicateClaims(claims: StructuredClaim[]): StructuredClaim[] {
  const byId = new Map<string, StructuredClaim>()
  for (const claim of claims) {
    const existing = byId.get(claim.id)
    if (!existing || claim.confidence > existing.confidence) {
      byId.set(claim.id, claim)
    }
  }

  const kept: StructuredClaim[] = []
  for (const claim of byId.values()) {
    const dup = kept.find(
      (k) =>
        wordOverlap(k.statement, claim.statement) > 0.72 ||
        normalizeStatement(k.statement) === normalizeStatement(claim.statement),
    )
    if (!dup) kept.push(claim)
    else if (claim.confidence > dup.confidence) {
      const idx = kept.indexOf(dup)
      kept[idx] = claim
    }
  }
  return kept
}

function mergeEvidence(items: Evidence[][]): Evidence[] {
  const map = new Map<string, Evidence>()
  for (const list of items) {
    for (const ev of list) {
      const key = `${Math.floor(ev.timestamp)}:${ev.text.slice(0, 40)}`
      if (!map.has(key)) map.set(key, ev)
    }
  }
  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp)
}

function mergeStringLists(lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const item of list) {
      const key = item.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(item.trim())
    }
  }
  return out
}

export function mergeChunkAnalyses(
  partials: SourceAnalysis[],
  base: Pick<SourceAnalysis, 'sourceId' | 'videoId' | 'voiceIndex' | 'title'>,
): SourceAnalysis {
  if (partials.length === 0) {
    throw new Error('No chunk analyses to merge.')
  }
  if (partials.length === 1) return partials[0]

  const claims = deduplicateClaims(partials.flatMap((p) => p.claims ?? []))
  const evidence = mergeEvidence(partials.map((p) => p.evidence ?? []))

  const bestThesis = partials
    .map((p) => p.thesis?.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0]

  const bestSummary = partials
    .map((p) => p.summary?.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0]

  return {
    sourceId: base.sourceId,
    videoId: base.videoId,
    voiceIndex: base.voiceIndex,
    title: base.title,
    summary: bestSummary ?? partials[0].summary,
    thesis: bestThesis ?? partials[0].thesis,
    topics: mergeStringLists(partials.map((p) => p.topics ?? [])).slice(0, 12),
    claims: claims.slice(0, 18),
    entities: partials.flatMap((p) => p.entities ?? []).slice(0, 20),
    conclusions: mergeStringLists(partials.map((p) => p.conclusions ?? [])).slice(0, 8),
    implications: mergeStringLists(partials.map((p) => p.implications ?? [])).slice(0, 8),
    evidence: evidence.slice(0, 40),
    stance: partials.find((p) => p.stance)?.stance ?? null,
  }
}

export function selectChunksForAnalysis<T>(chunks: T[], maxCalls: number): T[] {
  if (chunks.length <= maxCalls) return chunks
  const picked: T[] = []
  const step = (chunks.length - 1) / (maxCalls - 1)
  for (let i = 0; i < maxCalls; i += 1) {
    picked.push(chunks[Math.round(i * step)])
  }
  return picked
}
