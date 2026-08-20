import type { Evidence } from '@/lib/types/analysis'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export type ResolvedEvidence = {
  evidenceId: string
  sourceId: string
  videoId: string
  title: string
  channel: string
  url: string
  thumbnail?: string
  timestamp: number
  text: string
}

export function findEvidenceInDocument(
  doc: SynthesisDocument,
  sourceId: string,
  evidenceId: string,
): Evidence | null {
  const entry = doc.voices.find((v) => v.analysis?.sourceId === sourceId)
  return entry?.analysis?.evidence.find((e) => e.id === evidenceId) ?? null
}

export function resolveEvidenceForClaim(
  doc: SynthesisDocument,
  claimId: string,
  preferredSourceId?: string,
): ResolvedEvidence | null {
  const result = doc.result
  if (!result) return null

  for (const source of result.sources) {
    if (preferredSourceId && source.sourceId !== preferredSourceId) continue
    const claim = source.coreClaims.find((c) => c.id === claimId)
    if (!claim) continue

    const entry = doc.voices.find((v) => v.analysis?.sourceId === source.sourceId)
    if (!entry?.analysis) continue

    const evidenceId = claim.evidenceIds[0]
    const evidence = evidenceId
      ? entry.analysis.evidence.find((e) => e.id === evidenceId)
      : entry.analysis.evidence[0]

    if (!evidence) continue

    return {
      evidenceId: evidence.id,
      sourceId: source.sourceId,
      videoId: entry.voice.youtubeId,
      title: entry.voice.title,
      channel: entry.voice.channel,
      url: entry.voice.url,
      thumbnail: entry.voice.thumbnail,
      timestamp: evidence.timestamp,
      text: evidence.text,
    }
  }

  for (const entry of doc.voices) {
    if (!entry.analysis) continue
    if (preferredSourceId && entry.analysis.sourceId !== preferredSourceId) continue
    const claim = entry.analysis.claims.find((c) => c.id === claimId)
    if (!claim) continue
    const evidence = entry.analysis.evidence[0]
    if (!evidence) continue
    return {
      evidenceId: evidence.id,
      sourceId: entry.analysis.sourceId,
      videoId: entry.voice.youtubeId,
      title: entry.voice.title,
      channel: entry.voice.channel,
      url: entry.voice.url,
      thumbnail: entry.voice.thumbnail,
      timestamp: evidence.timestamp,
      text: evidence.text,
    }
  }

  return null
}

export function resolveEvidenceById(
  doc: SynthesisDocument,
  sourceId: string,
  evidenceId: string,
): ResolvedEvidence | null {
  const evidence = findEvidenceInDocument(doc, sourceId, evidenceId)
  const entry = doc.voices.find((v) => v.analysis?.sourceId === sourceId)
  if (!evidence || !entry?.analysis) return null

  return {
    evidenceId: evidence.id,
    sourceId,
    videoId: entry.voice.youtubeId,
    title: entry.voice.title,
    channel: entry.voice.channel,
    url: entry.voice.url,
    thumbnail: entry.voice.thumbnail,
    timestamp: evidence.timestamp,
    text: evidence.text,
  }
}
