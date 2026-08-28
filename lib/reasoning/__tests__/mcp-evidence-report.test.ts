import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { enrichClaimsForCrossSourceCandidates } from '@/lib/reasoning/candidate-funnel'
import { buildComparableClaimPool } from '@/lib/reasoning/comparable-claim-pool'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import { buildEvidenceCoverageDiagnostics } from '@/lib/reasoning/evidence-coverage'
import {
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import type { SourceAnalysis } from '@/lib/types/source'

const CENTRAL = 'What is MCP and how does it impact the AI industry?'
const JOB_ID = '14d8aa0a-e29e-4bd3-991d-ac9fc7660a3e'

function loadMcpSources(): SourceAnalysis[] {
  const path = join(process.cwd(), '.data', 'synthesis-jobs', JOB_ID, 'document.json')
  const doc = JSON.parse(readFileSync(path, 'utf8')) as {
    voices: Array<{ analysis?: SourceAnalysis }>
  }
  return doc.voices
    .map((v) => v.analysis)
    .filter((a): a is SourceAnalysis => Boolean(a))
    .map(normalizeSourceAnalysis)
}

describe('MCP cached job evidence report', () => {
  it('prints evidence grounding metrics from real 3-video analysis cache', () => {
    const sources = loadMcpSources()
    expect(sources.length).toBe(3)

    const ingested = ingestSourceUnderstanding(sources)
    const allClaims = filterHighSignalClaims(ingested.claims)
    const clusteredRelevance = sources.map((s) => ({
      sourceId: s.sourceId,
      classification: 'direct' as const,
      score: 0.9,
      reason: 'MCP',
      relevantClaimIds: [],
    }))
    const enhanced = enhanceSourceRelevance({
      sources,
      claims: allClaims,
      evidence: ingested.evidence,
      centralQuestion: CENTRAL,
      existing: clusteredRelevance,
    })
    const synthesisIds = synthesisIdsFromEnhanced(enhanced)
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL,
      sourceRelevance: enhanced,
    })
    const pool = buildComparableClaimPool({
      usableClaims: funnel.usableClaims,
      evidence: ingested.evidence,
      relevanceDiagnostics: funnel.diagnostics,
      centralQuestion: CENTRAL,
      synthesisSourceIds: synthesisIds,
    })
    const enriched = enrichClaimsForCrossSourceCandidates({
      acceptedClaims: pool.generationClaims,
      supplementalClaims: funnel.peripheralClaims,
      synthesisSourceIds: synthesisIds,
      minPerSource: 2,
      maxTotal: 28,
    })
    const heuristic = discoverHeuristicCandidates(enriched.claims)
    const coverage = buildEvidenceCoverageDiagnostics({
      allClaims,
      generationClaims: pool.generationClaims,
    })

    const report = {
      extracted: allClaims.length,
      relevanceUsable: funnel.usableClaims.length,
      direct: coverage.direct,
      paraphrase: coverage.paraphrase,
      context: coverage.context,
      noEvidence: coverage.noEvidence,
      reasoningEligible: coverage.reasoningEligible,
      generationEligible: pool.generationClaims.length,
      generationWithEvidence: coverage.generationWithEvidence,
      candidates: heuristic.all.length,
      bySource: coverage.bySource,
      noEvidenceInGeneration: pool.generationClaims.filter(
        (c) => c.evidenceStatus === 'NO_EVIDENCE',
      ).length,
    }

    // eslint-disable-next-line no-console
    console.log('MCP_EVIDENCE_REPORT', JSON.stringify(report, null, 2))

    expect(coverage.generationNoEvidence).toBe(0)
    expect(report.noEvidenceInGeneration).toBe(0)
    expect(coverage.direct + coverage.paraphrase + coverage.context).toBeGreaterThan(0)
  })
})
