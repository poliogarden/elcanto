/** Normalize stored evidence time to seconds for YouTube links. */
export function evidenceTimeSeconds(raw?: number): number | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined
  if (raw > 3600) return Math.floor(raw / 1000)
  return Math.floor(raw)
}
