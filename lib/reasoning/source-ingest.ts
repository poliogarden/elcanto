import type { SourceAnalysis } from '@/lib/types/source'
import type {
  ClaimType,
  ConfidenceLevel,
  ReasoningAssumption,
  ReasoningClaim,
  ReasoningConcept,
  ReasoningEvidence,
  ReasoningStance,
  StanceKind,
} from '@/lib/reasoning/types'

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'what',
  'when',
  'where',
  'which',
  'their',
  'they',
  'have',
  'been',
  'will',
  'would',
  'could',
  'should',
])

export function normalizeStatement(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Claim IDs must be owned by their source — LLM-provided ids with wrong prefixes break lineage. */
export function normalizeClaimId(
  rawId: string | undefined,
  sourceId: string,
  index: number,
): string {
  const fallback = `${sourceId}_claim_${index}`
  if (!rawId?.trim()) return fallback
  const trimmed = rawId.trim()
  if (!trimmed.startsWith(`${sourceId}_`)) return fallback
  return trimmed
}

function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 0.75) return 'strong'
  if (score >= 0.5) return 'moderate'
  return 'weak'
}

function inferClaimType(statement: string): ClaimType {
  const s = statement.toLowerCase()
  if (/\b(will|should|must|need to|ought)\b/.test(s)) return 'normative'
  if (/\b(will|likely|expect|predict|forecast)\b/.test(s)) return 'predictive'
  if (/\b(because|therefore|implies|suggests)\b/.test(s)) return 'interpretive'
  if (/\b(is|are|was|were|has|have)\b/.test(s)) return 'factual'
  return 'descriptive'
}

function mapStance(raw: string | null | undefined): StanceKind {
  if (!raw) return 'neutral'
  const s = raw.toLowerCase()
  if (/\b(skeptic|against|concern|warn|risk|doubt)\b/.test(s)) return 'skeptical'
  if (/\b(support|optim|positive|benefit|advantage)\b/.test(s)) return 'supportive'
  if (/\b(if|depends|conditional|case by case)\b/.test(s)) return 'conditional'
  if (/\b(mixed|both|however)\b/.test(s)) return 'mixed'
  return 'neutral'
}

export function ingestSourceUnderstanding(sources: SourceAnalysis[]): {
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  concepts: ReasoningConcept[]
  stances: ReasoningStance[]
  assumptions: ReasoningAssumption[]
} {
  const claims: ReasoningClaim[] = []
  const evidence: ReasoningEvidence[] = []
  const conceptByLabel = new Map<string, ReasoningConcept>()
  const stances: ReasoningStance[] = []
  const assumptions: ReasoningAssumption[] = []

  for (const source of sources) {
    const evidenceIdByText = new Map<string, string>()

    for (const [i, ev] of source.evidence.entries()) {
      const id = ev.id || `${source.sourceId}_ev_${i + 1}`
      evidence.push({
        id,
        sourceId: source.sourceId,
        videoId: source.videoId,
        timestampStart: ev.timestamp,
        timestampEnd: null,
        text: ev.text,
        confidence: 0.8,
      })
      evidenceIdByText.set(normalizeStatement(ev.text.slice(0, 80)), id)
    }

    const conceptIdsForSource: string[] = []

    for (const topic of [...source.topics, ...(source.importantConcepts ?? [])].slice(0, 8)) {
      const label = topic.trim()
      if (!label || label.length < 2) continue
      const key = normalizeStatement(label)
      let concept = [...conceptByLabel.values()].find((c) => normalizeStatement(c.label) === key)
      if (!concept) {
        concept = {
          id: `concept_${conceptByLabel.size + 1}`,
          label,
          sourceIds: [],
        }
        conceptByLabel.set(key, concept)
      }
      if (!concept.sourceIds.includes(source.sourceId)) concept.sourceIds.push(source.sourceId)
      conceptIdsForSource.push(concept.id)
    }

    for (const [i, rawClaim] of source.claims.entries()) {
      const statement = rawClaim.statement?.trim()
      if (!statement || statement.length < 12) continue

      const evidenceIds: string[] = []
      if (rawClaim.evidenceSummary) {
        const summaryKey = normalizeStatement(rawClaim.evidenceSummary.slice(0, 80))
        const exact = evidenceIdByText.get(summaryKey)
        if (exact) evidenceIds.push(exact)
        if (evidenceIds.length === 0) {
          for (const [key, id] of evidenceIdByText.entries()) {
            if (key.includes(summaryKey.slice(0, 30)) || summaryKey.includes(key.slice(0, 30))) {
              evidenceIds.push(id)
              break
            }
          }
        }
      }
      if (evidenceIds.length === 0) {
        const stmtNorm = normalizeStatement(statement)
        for (const ev of source.evidence) {
          const evId = ev.id || `${source.sourceId}_ev_match_${evidence.length}`
          const evNorm = normalizeStatement(ev.text)
          if (evNorm.length < 12) continue
          const snippet = evNorm.slice(0, 50)
          if (stmtNorm.includes(snippet) || evNorm.includes(stmtNorm.slice(0, 50))) {
            if (!evidenceIds.includes(evId)) evidenceIds.push(evId)
            break
          }
        }
      }

      const claimId = normalizeClaimId(rawClaim.id, source.sourceId, i + 1)

      if (evidenceIds.length === 0 && source.evidence.length > 0) {
        const stmtTokens = normalizeStatement(statement).split(/\W+/).filter((w) => w.length > 3)
        let bestEv: typeof source.evidence[number] | null = null
        let bestOverlap = 0
        for (const ev of source.evidence) {
          const evTokens = normalizeStatement(ev.text).split(/\W+/).filter((w) => w.length > 3)
          if (evTokens.length === 0) continue
          const setB = new Set(evTokens)
          let shared = 0
          for (const t of stmtTokens) if (setB.has(t)) shared++
          const overlap = shared / Math.max(stmtTokens.length, evTokens.length)
          if (overlap > bestOverlap) {
            bestOverlap = overlap
            bestEv = ev
          }
        }
        if (bestEv && bestOverlap >= 0.12) {
          const evId = bestEv.id || `${source.sourceId}_ev_weak_${i + 1}`
          evidenceIds.push(evId)
        }
      }

      claims.push({
        id: claimId,
        sourceId: source.sourceId,
        videoId: source.videoId,
        voiceIndex: source.voiceIndex,
        statement,
        normalizedStatement: normalizeStatement(statement),
        evidenceIds,
        claimType: inferClaimType(statement),
        confidence: scoreToConfidence(rawClaim.confidence ?? 0.6),
        conceptIds: conceptIdsForSource.slice(0, 4),
      })
    }

    if (source.stance && conceptIdsForSource[0]) {
      stances.push({
        id: `stance_${source.sourceId}`,
        sourceId: source.sourceId,
        conceptId: conceptIdsForSource[0],
        stance: mapStance(source.stance),
        summary: source.stance,
      })
    }

    for (const [i, assumptionText] of (source.assumptions ?? []).entries()) {
      const statement = assumptionText.trim()
      if (!statement || statement.length < 10) continue
      assumptions.push({
        id: `${source.sourceId}_assumption_${i + 1}`,
        sourceId: source.sourceId,
        statement,
        origin: 'explicit',
        confidence: 'moderate',
        linkedClaimIds: claims.filter((c) => c.sourceId === source.sourceId).slice(0, 3).map((c) => c.id),
      })
    }
  }

  return {
    claims,
    evidence,
    concepts: [...conceptByLabel.values()],
    stances,
    assumptions,
  }
}

export function filterHighSignalClaims(claims: ReasoningClaim[]): ReasoningClaim[] {
  const seenBySource = new Map<string, Set<string>>()
  const result: ReasoningClaim[] = []

  for (const claim of claims) {
    if (claim.confidence === 'weak') continue
    const words = claim.statement.split(/\s+/).filter(Boolean)
    if (words.length < 5 && claim.statement.length < 18) continue
    const seen = seenBySource.get(claim.sourceId) ?? new Set<string>()
    if (seen.has(claim.normalizedStatement)) continue
    seen.add(claim.normalizedStatement)
    seenBySource.set(claim.sourceId, seen)
    result.push(claim)
  }

  return result
}
