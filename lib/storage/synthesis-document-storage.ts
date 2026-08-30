import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'
import type { SynthesisDocument, SynthesisVoiceEntry } from '@/lib/types/synthesis-document'
import {
  pruneOldestByCreatedAt,
  safeSetItem,
  setItemWithQuotaRecovery,
} from '@/lib/storage/storage-quota'

export type SynthesisStorageTier = 'full' | 'slim'

const DOC_STORAGE_PREFIX = 'elcanto-synthesis-'

const SLIM_ANALYSIS_KEYS: Array<keyof SourceAnalysis> = [
  'sourceId',
  'videoId',
  'voiceIndex',
  'title',
  'summary',
  'thesis',
  'centralQuestion',
  'topics',
  'conclusions',
  'implications',
  'stance',
  'assumptions',
  'counterArguments',
  'limitations',
  'keyArguments',
  'importantConcepts',
  'uniquePerspective',
  'coverage',
]

function slimAnalysis(analysis: SourceAnalysis): SourceAnalysis {
  const slim = {} as SourceAnalysis
  for (const key of SLIM_ANALYSIS_KEYS) {
    const value = analysis[key]
    if (value !== undefined) slim[key] = value as never
  }
  slim.claims = []
  slim.entities = []
  slim.evidence = []
  return slim
}

function slimVoiceEntry(entry: SynthesisVoiceEntry): SynthesisVoiceEntry {
  return {
    voice: entry.voice,
    source: entry.source,
    analysis: entry.analysis ? slimAnalysis(entry.analysis) : undefined,
    error: entry.error,
    failure: entry.failure,
  }
}

function claimIdsNeededForSlim(reasoning: MultiSourceReasoning): Set<string> {
  const ids = new Set<string>()
  for (const r of reasoning.relationships) {
    if (r.verificationStatus === 'SUPPORTED') {
      ids.add(r.fromClaimId)
      ids.add(r.toClaimId)
    }
  }
  for (const cluster of reasoning.significantRelationships ?? []) {
    for (const cid of cluster.supportingClaimIds ?? []) ids.add(cid)
  }
  for (const p of reasoning.patterns) {
    for (const cid of p.claimIds) ids.add(cid)
  }
  for (const ins of reasoning.insights) {
    for (const cid of ins.claimIds) ids.add(cid)
  }
  return ids
}

function slimMultiReasoning(
  reasoning: MultiSourceReasoning,
  synthesizedSourceIds: Set<string>,
): MultiSourceReasoning {
  const verified = reasoning.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
  const neededClaimIds = claimIdsNeededForSlim(reasoning)
  const synthesizedClaims = reasoning.claims.filter((c) => synthesizedSourceIds.has(c.sourceId))
  const slimClaims =
    neededClaimIds.size > 0
      ? synthesizedClaims.filter((c) => neededClaimIds.has(c.id))
      : synthesizedClaims.slice(0, 24)
  const claimEvidenceIds = new Set(slimClaims.flatMap((c) => c.evidenceIds))
  const slimEvidence = reasoning.evidence.filter((e) => claimEvidenceIds.has(e.id))

  return {
    ...reasoning,
    claims: slimClaims,
    evidence: slimEvidence,
    concepts: [],
    stances: [],
    assumptions: [],
    relationships: verified,
    rejectedRelationships: reasoning.rejectedRelationships.slice(0, 30),
    relationshipClusters: reasoning.relationshipClusters,
    significantRelationships: reasoning.significantRelationships,
    patterns: reasoning.patterns,
    synthesis: reasoning.synthesis,
    judgment: reasoning.judgment,
    insights: reasoning.insights,
    knowledgeGaps: reasoning.knowledgeGaps,
    landscape: reasoning.landscape,
    clusters: reasoning.clusters,
    excludedSources: reasoning.excludedSources,
    sourceRelevance: reasoning.sourceRelevance,
    diagnostics: reasoning.diagnostics,
  }
}

/** Strip transcript-scale payloads — server job/API holds the full document. */
export function slimSynthesisDocument(doc: SynthesisDocument): SynthesisDocument {
  const slim: SynthesisDocument = {
    ...doc,
    storageTier: 'slim',
    voices: doc.voices.map(slimVoiceEntry),
    survival: doc.survival
      ? {
          ...doc.survival,
          claims: doc.survival.claims.slice(0, 8),
          verifiedRelationships: doc.survival.verifiedRelationships.slice(0, 8),
          rejectedRelationships: doc.survival.rejectedRelationships.slice(0, 4),
        }
      : undefined,
    reasoning:
      doc.reasoning?.mode === 'multi'
        ? slimMultiReasoning(
            doc.reasoning,
            new Set(
              doc.voices
                .map((v) => v.source?.sourceId ?? `source_${v.voice.n}`)
                .filter((sid) => {
                  const multi = doc.reasoning
                  if (multi?.mode !== 'multi') return true
                  return !multi.excludedSources.some((e) => e.sourceId === sid)
                }),
            ),
          )
        : doc.reasoning,
  }
  return slim
}

export function isSynthesisDocumentHydrated(doc: SynthesisDocument): boolean {
  if (doc.storageTier === 'slim') return false
  if (doc.directSynthesis?.directAnswer) return true
  if (doc.reasoning?.mode === 'multi') {
    return doc.reasoning.claims.length > 0 || Boolean(doc.survival)
  }
  if (doc.reasoning?.mode === 'single') return true
  if (doc.survival) return doc.survival.claims.length > 0
  return Boolean(doc.result)
}

export function persistSynthesisDocument(
  key: string,
  doc: SynthesisDocument,
  storages?: { sessionStorage: Storage; localStorage: Storage },
): SynthesisStorageTier {
  if (typeof window === 'undefined' && !storages) return 'full'

  const session = storages?.sessionStorage ?? window.sessionStorage
  const local = storages?.localStorage ?? window.localStorage

  const fullPayload = JSON.stringify({ ...doc, storageTier: 'full' as const })
  const slimPayload = JSON.stringify(slimSynthesisDocument(doc))

  const recoverLocalQuota = (removeCount: number) => {
    pruneOldestByCreatedAt(local, DOC_STORAGE_PREFIX, removeCount)
  }

  if (safeSetItem(session, key, fullPayload)) {
    if (
      setItemWithQuotaRecovery(local, key, fullPayload, () => recoverLocalQuota(3)) ||
      setItemWithQuotaRecovery(local, key, slimPayload, () => recoverLocalQuota(5))
    ) {
      return 'full'
    }
    return 'full'
  }

  const sessionOk =
    setItemWithQuotaRecovery(session, key, slimPayload, () =>
      pruneOldestByCreatedAt(session, DOC_STORAGE_PREFIX, 2),
    )
  setItemWithQuotaRecovery(local, key, slimPayload, () => recoverLocalQuota(5))
  return sessionOk ? 'slim' : 'slim'
}
