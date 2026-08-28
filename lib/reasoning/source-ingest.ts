import {
  buildEvidenceSpan,
  classifyEvidenceSupport,
  isReasoningEligible,
  mergeEvidenceStatus,
  type ClaimEvidenceSpan,
  type ClaimEvidenceStatus,
} from '@/lib/reasoning/claim-evidence'
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
import type { Evidence } from '@/lib/types/analysis'

function parseClockTimestampToSeconds(match: RegExpMatchArray): number {
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  return minutes * 60 + seconds
}

function isPlaceholderSectionText(text: string): boolean {
  return /introduces the topic but does not provide|does not convey any meaningful|merely mentioning|does not provide detailed information/i.test(
    text,
  )
}

function sectionText(sec: {
  text?: string
  summary: string
}): string {
  return (sec.text?.trim() ? sec.text : sec.summary).trim()
}

function resolveSectionByKeywords(
  evidenceSummary: string,
  sections: Array<{
    sectionId: string
    startTime: number
    endTime: number
    text?: string
    summary: string
  }>,
): { sectionId: string; text: string } | null {
  const cleaned = evidenceSummary
    .replace(/\[\]/g, '')
    .replace(/\(\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2})?\)/g, '')
    .replace(/\[\d+s\]/g, '')
  const keywords = normalizeStatement(cleaned)
    .split(/\W+/)
    .filter((w) => w.length >= 4)
    .slice(0, 12)

  if (keywords.length < 2) return null

  let best: typeof sections[number] | null = null
  let bestScore = 0
  for (const sec of sections) {
    const text = sectionText(sec)
    if (isPlaceholderSectionText(text)) continue
    const normalized = normalizeStatement(text)
    let score = 0
    for (const k of keywords) if (normalized.includes(k)) score++
    if (score > bestScore) {
      bestScore = score
      best = sec
    }
  }

  if (!best || bestScore < 2) return null
  return { sectionId: best.sectionId, text: sectionText(best) }
}

function resolveSectionFromEvidenceSummary(
  evidenceSummary: string,
  sections: Array<{
    sectionId: string
    startTime: number
    endTime: number
    text?: string
    summary: string
  }>,
): { sectionId: string; text: string } | null {
  const keywordMatch = resolveSectionByKeywords(evidenceSummary, sections)

  const resolveAtTime = (t: number): { sectionId: string; text: string } | null => {
    const sec = sections.find((s) => t >= s.startTime && t <= s.endTime)
    if (!sec) return null
    const text = sectionText(sec)
    if (isPlaceholderSectionText(text)) return null
    return { sectionId: sec.sectionId, text }
  }

  const secMatch = evidenceSummary.match(/\[(\d+)s\]/)
  if (secMatch) {
    const resolved = resolveAtTime(Number(secMatch[1]))
    if (resolved) return resolved
  }

  const clockMatch = evidenceSummary.match(/\((\d{1,2}):(\d{2})(?:\s*,\s*\d{1,2}:\d{2})?\)/)
  if (clockMatch) {
    const resolved = resolveAtTime(parseClockTimestampToSeconds(clockMatch))
    if (resolved) return resolved
  }

  const looseClock = evidenceSummary.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/)
  if (looseClock) {
    const resolved = resolveAtTime(parseClockTimestampToSeconds(looseClock))
    if (resolved) return resolved
  }

  return keywordMatch
}

function isClaimEchoEvidence(evidenceId: string, sourceId: string): boolean {
  return new RegExp(`^${sourceId}_claim_\\d+$`).test(evidenceId)
}

function rehydrateSourceEvidence(source: SourceAnalysis): SourceAnalysis {
  const sections = source.videoKnowledge?.sections ?? []
  if (sections.length === 0) return source

  const sectionEvidence: Evidence[] = sections.map((s) => ({
    id: `${source.sourceId}_seg_${s.sectionId}`,
    timestamp: s.startTime,
    text: (s.text?.trim() ? s.text : s.summary).trim(),
    segmentId: s.sectionId,
    endTime: s.endTime,
  }))

  const evidenceById = new Map<string, Evidence>()
  for (const ev of [...sectionEvidence, ...source.evidence]) {
    if (ev.id) evidenceById.set(ev.id, ev)
  }

  const claims = source.claims.map((claim) => {
    let sourceSegmentId = claim.sourceSegmentId
    let evidenceSegmentIds = [...(claim.evidenceSegmentIds ?? [])]
    let evidenceSummary = claim.evidenceSummary

    if (!sourceSegmentId && claim.evidenceSummary) {
      const resolved = resolveSectionFromEvidenceSummary(claim.evidenceSummary, sections)
      if (resolved) {
        sourceSegmentId = resolved.sectionId
        if (!evidenceSegmentIds.includes(resolved.sectionId)) {
          evidenceSegmentIds.push(resolved.sectionId)
        }
        evidenceSummary = resolved.text.slice(0, 280)
      }
    }

    if (!sourceSegmentId) {
      const claimNorm = normalizeStatement(claim.statement)
      for (const sec of sections) {
        const sectionClaim = sec.claims.find(
          (sc) => normalizeStatement(sc.statement) === claimNorm,
        )
        if (sectionClaim) {
          sourceSegmentId = sec.sectionId
          if (!evidenceSegmentIds.includes(sec.sectionId)) {
            evidenceSegmentIds.push(sec.sectionId)
          }
          evidenceSummary = (sec.text?.trim() ? sec.text : sec.summary).slice(0, 280)
          break
        }
      }
    }

    if (!sourceSegmentId && evidenceSummary) {
      const summaryKey = normalizeStatement(evidenceSummary.replace(/\[\d+s\]/g, '').slice(0, 80))
      for (const sec of sections) {
        const secText = normalizeStatement((sec.text ?? sec.summary).slice(0, 120))
        if (secText.includes(summaryKey.slice(0, 40)) || summaryKey.includes(secText.slice(0, 40))) {
          sourceSegmentId = sec.sectionId
          if (!evidenceSegmentIds.includes(sec.sectionId)) {
            evidenceSegmentIds.push(sec.sectionId)
          }
          break
        }
      }
    }

    return {
      ...claim,
      sourceSegmentId,
      evidenceSegmentIds: evidenceSegmentIds.length > 0 ? evidenceSegmentIds : claim.evidenceSegmentIds,
      evidenceSummary,
      segmentStartTime: claim.segmentStartTime,
      segmentEndTime: claim.segmentEndTime,
    }
  })

  return {
    ...source,
    claims,
    evidence: [...evidenceById.values()],
  }
}

function segmentEvidenceId(sourceId: string, segmentId: string): string {
  return `${sourceId}_seg_${segmentId}`
}

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

function bindClaimEvidence(input: {
  claim: ReasoningClaim
  evidenceById: Map<string, ReasoningEvidence>
  segmentTextById: Map<string, { text: string; start: number; end: number | null }>
}): ReasoningClaim {
  const spans: ClaimEvidenceSpan[] = []
  const statuses: ClaimEvidenceStatus[] = []

  for (const evidenceId of input.claim.evidenceIds) {
    const ev = input.evidenceById.get(evidenceId)
    if (!ev) continue
    const segmentId = ev.segmentId ?? evidenceId
    const span = buildEvidenceSpan({
      segmentId,
      startTime: ev.timestampStart,
      endTime: ev.timestampEnd,
      originalText: ev.text,
      claimText: input.claim.statement,
    })
    if (span) {
      spans.push(span)
      statuses.push(span.evidenceType)
    } else {
      const classified = classifyEvidenceSupport(input.claim.statement, ev.text)
      statuses.push(classified.status)
    }
  }

  for (const segmentId of input.claim.evidenceSpans?.map((s) => s.segmentId) ?? []) {
    const seg = input.segmentTextById.get(segmentId)
    if (!seg) continue
    const span = buildEvidenceSpan({
      segmentId,
      startTime: seg.start,
      endTime: seg.end,
      originalText: seg.text,
      claimText: input.claim.statement,
    })
    if (span && !spans.some((s) => s.segmentId === span.segmentId)) spans.push(span)
  }

  const evidenceStatus = mergeEvidenceStatus(statuses)
  const reasoningEligible = isReasoningEligible(evidenceStatus)
  const primarySpan = spans[0]
  const primaryEv = input.claim.evidenceIds[0]
    ? input.evidenceById.get(input.claim.evidenceIds[0])
    : undefined

  return {
    ...input.claim,
    evidenceSpans: spans,
    evidenceStatus,
    reasoningEligible,
    evidenceText: primarySpan?.originalText ?? primaryEv?.text ?? input.claim.evidenceText,
    timestampStart: primarySpan?.startTime ?? primaryEv?.timestampStart,
    timestampEnd: primarySpan?.endTime ?? primaryEv?.timestampEnd ?? undefined,
  }
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

  for (const rawSource of sources) {
    const source = rehydrateSourceEvidence(rawSource)
    const evidenceIdByText = new Map<string, string>()
    const segmentTextById = new Map<string, { text: string; start: number; end: number | null }>()

    for (const [i, ev] of source.evidence.entries()) {
      const segmentId = ev.segmentId ?? `ev_${i + 1}`
      const id = ev.id || segmentEvidenceId(source.sourceId, segmentId)
      evidence.push({
        id,
        sourceId: source.sourceId,
        videoId: source.videoId,
        timestampStart: ev.timestamp,
        timestampEnd: ev.endTime ?? null,
        text: ev.text,
        confidence: 0.8,
        segmentId,
      })
      evidenceIdByText.set(normalizeStatement(ev.text.slice(0, 80)), id)
      segmentTextById.set(segmentId, {
        text: ev.text,
        start: ev.timestamp,
        end: ev.endTime ?? null,
      })
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

      if (rawClaim.sourceSegmentId) {
        const segId = segmentEvidenceId(source.sourceId, rawClaim.sourceSegmentId)
        if (segmentTextById.has(rawClaim.sourceSegmentId)) {
          evidenceIds.push(segId)
        }
      }

      for (const segId of rawClaim.evidenceSegmentIds ?? []) {
        const evId = segmentEvidenceId(source.sourceId, segId)
        if (!evidenceIds.includes(evId) && segmentTextById.has(segId)) {
          evidenceIds.push(evId)
        }
      }

      if (rawClaim.evidenceSummary) {
        const summaryKey = normalizeStatement(rawClaim.evidenceSummary.slice(0, 80))
        const exact = evidenceIdByText.get(summaryKey)
        if (exact && !evidenceIds.includes(exact)) evidenceIds.push(exact)
        if (evidenceIds.length === 0) {
          for (const [key, id] of evidenceIdByText.entries()) {
            if (key.includes(summaryKey.slice(0, 30)) || summaryKey.includes(key.slice(0, 30))) {
              if (!evidenceIds.includes(id)) evidenceIds.push(id)
              break
            }
          }
        }
      }

      if (evidenceIds.length === 0 && rawClaim.evidenceSummary) {
        const resolved = resolveSectionFromEvidenceSummary(
          rawClaim.evidenceSummary,
          source.videoKnowledge?.sections ?? [],
        )
        if (resolved) {
          const segId = segmentEvidenceId(source.sourceId, resolved.sectionId)
          if (!evidenceIds.includes(segId)) evidenceIds.push(segId)
        }
      }

      if (evidenceIds.length === 0) {
        const stmtNorm = normalizeStatement(statement)
        for (const ev of source.evidence) {
          const segmentId = ev.segmentId ?? `ev_${source.evidence.indexOf(ev) + 1}`
          const evId = ev.id || segmentEvidenceId(source.sourceId, segmentId)
          if (ev.id && isClaimEchoEvidence(ev.id, source.sourceId)) continue
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
          if (ev.id && isClaimEchoEvidence(ev.id, source.sourceId)) continue
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
          const segmentId = bestEv.segmentId ?? `ev_${source.evidence.indexOf(bestEv) + 1}`
          const evId = bestEv.id || segmentEvidenceId(source.sourceId, segmentId)
          evidenceIds.push(evId)
        }
      }

      const baseClaim: ReasoningClaim = {
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
      }

      const evidenceById = new Map(evidence.filter((e) => e.sourceId === source.sourceId).map((e) => [e.id, e]))
      claims.push(
        bindClaimEvidence({
          claim: baseClaim,
          evidenceById,
          segmentTextById,
        }),
      )
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
