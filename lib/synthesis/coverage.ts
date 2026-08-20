import type { PipelineCoverage } from '@/lib/types/source'

export function findMissingSourceIds(
  required: string[],
  used: string[],
): string[] {
  const usedSet = new Set(used)
  return required.filter((id) => !usedSet.has(id))
}

export function assertSynthesisCoverage(
  requiredSourceIds: string[],
  usedSourceIds: string[],
): { ok: true } | { ok: false; missingSourceIds: string[] } {
  const missingSourceIds = findMissingSourceIds(requiredSourceIds, usedSourceIds)
  if (missingSourceIds.length > 0) return { ok: false, missingSourceIds }
  return { ok: true }
}

/** Partial run: some sources failed to load — do not treat as full multi-source synthesis */
export function isPartialCoverage(coverage: PipelineCoverage): boolean {
  return coverage.analyzedSourceCount < coverage.requestedSourceCount
}

export function canRunFullSynthesis(
  coverage: PipelineCoverage,
  minRequired = 1,
): boolean {
  return coverage.analyzedSourceCount >= minRequired
}
