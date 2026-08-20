const MIN_CLIP = 5
const MAX_CLIP = 20
const PAD_BEFORE = 2
const PAD_AFTER = 4

/** Compute clip in/out from evidence timestamp with sentence-aware padding */
export function computeClipBounds(
  timestamp: number,
  evidenceText: string,
): { sourceStart: number; sourceEnd: number } {
  const wordCount = evidenceText.split(/\s+/).filter(Boolean).length
  const extra = Math.min(6, Math.floor(wordCount / 8))
  let start = Math.max(0, timestamp - PAD_BEFORE)
  let end = timestamp + PAD_AFTER + extra
  const duration = end - start

  if (duration < MIN_CLIP) {
    end = start + MIN_CLIP
  }
  if (duration > MAX_CLIP) {
    end = start + MAX_CLIP
  }

  return { sourceStart: Math.round(start * 10) / 10, sourceEnd: Math.round(end * 10) / 10 }
}

export function estimateBlockDuration(
  type: string,
  clipDuration?: number,
): number {
  if (type === 'clip' && clipDuration) return clipDuration
  if (type === 'insight') return 5
  if (type === 'hook' || type === 'ending') return 4
  return 3.5
}
