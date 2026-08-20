import {
  isMeaningfulRelationship,
  RELATIONSHIP_STRENGTH,
  strengthLabel,
} from '@/lib/synthesis/consensus-rules'
import type { ClaimRelationship, RelationshipStats } from '@/lib/types/relationship'

export function computeRelationshipStats(
  relationships: ClaimRelationship[],
): RelationshipStats {
  let strong = 0
  let moderate = 0
  let weak = 0
  let independent = 0

  for (const r of relationships) {
    if (r.type === 'independent' || !isMeaningfulRelationship(r.strength)) {
      independent++
      continue
    }
    const label = strengthLabel(r.strength)
    if (label === 'strong') strong++
    else if (label === 'moderate') moderate++
    else if (label === 'weak') weak++
    else independent++
  }

  return {
    tested: relationships.length,
    strong,
    moderate,
    weak,
    independent,
  }
}

export function strengthDisplayLabel(strength: number, type?: string): string {
  if (type === 'independent' || !isMeaningfulRelationship(strength)) {
    return 'INDEPENDENT'
  }
  const label = strengthLabel(strength)
  if (label === 'strong') return 'STRONG'
  if (label === 'moderate') return 'MODERATE'
  if (label === 'weak') return 'WEAK'
  return 'INDEPENDENT'
}

export function isDisplayableRelationship(r: ClaimRelationship): boolean {
  return r.type !== 'independent' && isMeaningfulRelationship(r.strength)
}

export function hasStrongCrossSourceRelationship(stats: RelationshipStats): boolean {
  return stats.strong > 0 || stats.moderate > 0
}

export { RELATIONSHIP_STRENGTH }
