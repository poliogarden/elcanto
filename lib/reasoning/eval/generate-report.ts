import { runInvariantChecks, formatEvidenceForReport } from '@/lib/reasoning/eval/invariants'
import {
  buildSource2ExtractionRegression,
  formatSource2RegressionSection,
} from '@/lib/reasoning/eval/source-2-extraction-regression'
import {
  buildDeepDiagnostics,
  formatClaimLossSection,
  formatE2eFailureSection,
  formatFalseRejectionSection,
  formatVerificationLossSection,
} from '@/lib/reasoning/eval/deep-diagnostics'
import {
  collectEvalSummaryMetrics,
  formatEvalBeforeAfterSection,
  formatExtractionCoverageSection,
  formatRelationshipPrecisionSection,
  formatComplementaryPrecisionSection,
} from '@/lib/reasoning/eval/eval-summary'
import {
  INVALID_QUALITY_LABEL,
  type ReasoningEvalSnapshot,
} from '@/lib/reasoning/eval/types'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import { isDefensibleJudgmentProposition } from '@/lib/reasoning/judgment-lineage'

function na(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A'
  return String(value)
}

function qualityValue(
  value: string | number | null | undefined,
  qualityValid: boolean,
): string {
  if (!qualityValid) return INVALID_QUALITY_LABEL
  return na(value)
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n\n`
}

function loadPreviousSnapshot(rawPath: string): ReasoningEvalSnapshot | null {
  try {
    const { readFileSync, existsSync } = require('node:fs') as typeof import('node:fs')
    if (!existsSync(rawPath)) return null
    return JSON.parse(readFileSync(rawPath, 'utf8')) as ReasoningEvalSnapshot
  } catch {
    return null
  }
}

function loadPreviousMetrics(rawPath: string): Record<string, number> | null {
  try {
    const { readFileSync, existsSync } = require('node:fs') as typeof import('node:fs')
    if (!existsSync(rawPath)) return null
    const prev = JSON.parse(readFileSync(rawPath, 'utf8')) as ReasoningEvalSnapshot
    const stats = prev.reasoning?.diagnostics?.pipelineStats
    const comparable = prev.reasoning?.diagnostics?.comparableClaimFunnel
    if (!stats) return null
    return {
      generationClaims:
        stats.generationEligible ??
        comparable?.generationEligible ??
        0,
      candidates: stats.candidatePairs ?? 0,
      verified: stats.verifiedRelationships ?? 0,
      clusters: stats.relationshipClusters ?? 0,
    }
  } catch {
    return null
  }
}

function rejectionBucket(reason: string | undefined): string {
  if (!reason) return 'UNKNOWN'
  const r = reason.toUpperCase()
  if (r.includes('ALIGNMENT')) return 'ALIGNMENT_FAILED'
  if (r.includes('DIFFERENT_DIMENSION') || r.includes('DIMENSION')) return 'DIFFERENT_DIMENSION'
  if (r.includes('LOGICAL_GAP')) return 'LOGICAL_GAP'
  if (r.includes('TOPIC_ONLY')) return 'TOPIC_ONLY'
  if (r.includes('INSUFFICIENT_EVIDENCE') || r.includes('EVIDENCE')) return 'INSUFFICIENT_EVIDENCE'
  if (r.includes('SUBJECT')) return 'SUBJECT_MISMATCH'
  if (r.includes('POLARITY')) return 'POLARITY_MISMATCH'
  return 'UNKNOWN'
}

export function generateReasoningEvalReport(
  snapshot: ReasoningEvalSnapshot,
  previousRawPath?: string,
): string {
  const r = snapshot.reasoning
  const d = r?.diagnostics
  const stats = d?.pipelineStats
  const funnel = d?.relevanceFunnel?.funnel
  const candidateFunnel = d?.candidateFunnel
  const bundle = d?.verificationDiagnosticsBundle
  const evidenceCov = d?.evidenceCoverage
  const comparable = d?.comparableClaimFunnel
  const participation = d?.sourceParticipation
  const qualityValid = snapshot.meta.e2eQualityValid
  const pipelineModeLabel =
    snapshot.meta.pipelineMode === 'LIVE' ? 'LIVE' : 'DETERMINISTIC_TEST'

  const lines: string[] = []

  lines.push('# elcanto Reasoning Evaluation Report')
  lines.push('')
  lines.push(`Generated At: ${snapshot.meta.generatedAt}`)
  lines.push(`Engine Version: ${snapshot.meta.engineVersion}`)
  lines.push(`Schema Version: ${na(snapshot.meta.schemaVersion)}`)
  lines.push(`Fixture: ${snapshot.meta.fixtureId}`)
  lines.push(`Question: ${snapshot.meta.question}`)
  lines.push(`Input Sources: ${snapshot.meta.inputSourceCount}`)
  lines.push(`Commit: ${snapshot.meta.commit}`)
  lines.push(`Pipeline Mode: ${pipelineModeLabel}`)
  if (snapshot.meta.pipelineError) {
    lines.push(`Pipeline Error: ${snapshot.meta.pipelineError}`)
  }
  if (!qualityValid) {
    lines.push(`E2E Quality Metrics: ${INVALID_QUALITY_LABEL}`)
  }
  lines.push('')

  const relevantSources =
    stats?.relevantSources ?? stats?.synthesizedSources ?? snapshot.meta.inputSourceCount
  const genParticipating =
    participation?.generationParticipatingCount ??
    stats?.participatingSourceCount ??
    'N/A'
  const possiblePairs =
    candidateFunnel?.possibleCrossSourcePairs ?? stats?.possibleCrossSourcePairs ?? 'N/A'
  const clusters =
    stats?.relationshipClusters ?? r?.relationshipClusters?.length ?? 'N/A'
  const significantClusters = r?.significantRelationships?.length ?? 'N/A'
  const agreeCount =
    stats?.verifiedAgreements ?? r?.landscape?.agree?.cards?.length ?? 'N/A'
  const divideCount =
    stats?.verifiedContradictions ?? r?.landscape?.divide?.cards?.length ?? 'N/A'
  const gapCount = r?.knowledgeGaps?.length ?? 0
  const emergentCount = r?.insights?.length ?? stats?.verifiedEmergentInsights ?? 0
  const judgmentConf = r?.judgment?.confidence ?? 'N/A'

  lines.push(section(
    'Executive Summary',
    `
- Input sources: ${snapshot.meta.inputSourceCount}
- Relevant sources: ${na(relevantSources)}
- Generation participating sources: ${na(genParticipating)}
- Claims extracted: ${na(stats?.claimsExtracted)}
- Relevance usable: ${na(funnel?.finalUsable ?? stats?.funnelFinalUsable)}
- Reasoning eligible: ${na(evidenceCov?.reasoningEligible)}
- Possible cross-source pairs: ${na(possiblePairs)}
- Candidate pairs: ${na(stats?.candidatePairs)}
- Verified relationships: ${qualityValue(stats?.verifiedRelationships, qualityValid)}
- Relationship clusters: ${qualityValue(clusters, qualityValid)}
- Agree: ${qualityValue(agreeCount, qualityValid)}
- Divide: ${qualityValue(divideCount, qualityValid)}
- Gap: ${qualityValue(gapCount, qualityValid)}
- Emergent: ${qualityValue(emergentCount, qualityValid)}
- Judgment confidence: ${qualityValue(judgmentConf, qualityValid)}
`,
  ))

  lines.push(section(
    'Pipeline Funnel',
    `
### Claims

Extracted: ${na(stats?.claimsExtracted)}
Topic Relevant: ${na(funnel?.topicRelevant ?? stats?.topicRelevant)}
Primary: ${na(funnel?.primaryTier ?? stats?.claimsPrimaryTier)}
Supporting: ${na(funnel?.supportingTier ?? stats?.claimsSupportingTier)}
Peripheral: ${na(funnel?.peripheralTier ?? stats?.claimsPeripheralTier)}
Off-topic: ${na(funnel?.offTopicTier)}
Comparable: ${na(comparable?.comparable ?? stats?.comparableClaims)}
Generation Eligible: ${na(comparable?.generationEligible ?? stats?.generationEligible)}

### Candidates

Possible Cross-source Pairs: ${na(possiblePairs)}
Direct Candidates: ${na(stats?.directCandidates)}
Semantic Candidates: ${na(stats?.semanticCandidates)}
LLM Candidates: ${na(candidateFunnel?.llmCandidatesAdded)}
Total Candidates: ${na(stats?.candidatePairs)}

### Verification

Verifier Input: ${na(stats?.candidatePairs)}
Verified: ${qualityValue(stats?.verifiedRelationships, qualityValid)}
Rejected: ${qualityValue(stats?.rejectedRelationships, qualityValid)}

### Consolidation

Verified Pairs: ${qualityValue(stats?.verifiedRelationships, qualityValid)}
Normalized Propositions: ${qualityValue(stats?.normalizedPropositions, qualityValid)}
Relationship Clusters: ${qualityValue(clusters, qualityValid)}
Significant Clusters: ${qualityValue(significantClusters, qualityValid)}

### Output

Agreement: ${qualityValue(agreeCount, qualityValid)}
Divide: ${qualityValue(divideCount, qualityValid)}
Complementary: ${qualityValue(stats?.verifiedComplementary, qualityValid)}
Gap: ${qualityValue(gapCount, qualityValid)}
Emergent: ${qualityValue(emergentCount, qualityValid)}
`,
  ))

  if (participation?.rows?.length) {
    const srcBlocks = participation.rows.map((row, i) => {
      const src = snapshot.sources.find((s) => s.sourceId === row.sourceId)
      return `
### Source ${i + 1}

- Source ID: ${row.sourceId}
- Title: ${src?.title ?? 'N/A'}
- Extracted: ${row.extracted}
- Relevant: ${row.relevanceUsable}
- Comparable: ${row.comparable}
- Generation: ${row.generationClaims}
- Candidate pairs: ${row.candidatePairsAsMember}
- Verified: ${row.verifiedRelationships}
- Clusters: ${row.clusterMembership}
${row.candidateZeroReason ? `- Candidate zero reason: ${row.candidateZeroReason}` : ''}
`
    })
    lines.push(section('Source Participation', srcBlocks.join('\n')))
  } else if (snapshot.sources.length > 0) {
    const srcBlocks = snapshot.sources.map((src, i) => `
### Source ${i + 1}

- Source ID: ${src.sourceId}
- Title: ${src.title}
- Extracted: N/A
- Relevant: N/A
- Comparable: N/A
- Generation: N/A
- Candidate pairs: N/A
- Verified: N/A
- Clusters: N/A
`)
    lines.push(section('Source Participation', srcBlocks.join('\n')))
  }

  if (bundle?.crossSourceMatrix?.length) {
    const rows = bundle.crossSourceMatrix.map(
      (row) =>
        `| ${row.labelA} ↔ ${row.labelB} | ${row.possiblePairs} | ${row.generatedCandidates} | ${row.verifiedRelationships} | ${row.topRejectionReason ?? 'N/A'} |`,
    )
    lines.push(section(
      'Cross-source Matrix',
      `
| Pair | Possible | Candidates | Verified | Top Rejection Reason |
|---|---:|---:|---:|---|
${rows.join('\n')}
`,
    ))
  }

  if (evidenceCov) {
    lines.push(section(
      'Evidence Coverage',
      `
### Overall

- DIRECT_EVIDENCE: ${evidenceCov.direct}
- PARAPHRASE_SUPPORTED: ${evidenceCov.paraphrase}
- CONTEXT_SUPPORTED: ${evidenceCov.context}
- NO_EVIDENCE: ${evidenceCov.noEvidence}
- Reasoning eligible with evidence: ${evidenceCov.reasoningEligible}
- Reasoning excluded due to evidence: ${evidenceCov.reasoningExcluded}

### By Source

${evidenceCov.bySource
  .map(
    (row) => `
#### V${row.voiceIndex}
- Direct: ${row.direct}
- Paraphrase: ${row.paraphrase}
- Context: ${row.context}
- None: ${row.noEvidence}
`,
  )
  .join('\n')}
`,
    ))
  }

  if (bundle?.claimSpecificityBySource?.length) {
    const rows = bundle.claimSpecificityBySource.map(
      (row) =>
        `| V${row.voiceIndex} | ${row.specific} | ${row.general} | ${row.hype} | ${row.meta} | ${row.procedural} | ${row.observational} |`,
    )
    lines.push(section(
      'Claim Quality',
      `
| Source | Specific | General | Hype | Meta | Procedural | Observational |
|---|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}
`,
    ))
  }

  if (bundle?.topCandidates?.length) {
    const blocks = bundle.topCandidates.map((c, i) => `
### Candidate #${i + 1}

Source A: V${c.voiceA}
Claim A: ${c.claimA}

Source B: V${c.voiceB}
Claim B: ${c.claimB}

Candidate Type: ${c.proposedType}
Origin: ${c.origin}

Scores:
- semantic: ${c.semanticSimilarity.toFixed(3)}
- topic: ${c.topicSimilarity.toFixed(3)}
- subject: ${c.subjectSimilarity.toFixed(3)}
- predicate: ${c.predicateSimilarity.toFixed(3)}
- polarity: ${c.polarityCompatibility}
- total: ${c.candidateScore.toFixed(3)}

Evidence A: ${c.claimAEvidenceStatus}
Evidence B: ${c.claimBEvidenceStatus}

Verification: ${c.verificationResult}
Rejection Reason: ${c.verificationRejectionReason ?? 'N/A'}
Final Score: ${c.finalVerificationScore.toFixed(3)}
Threshold: ${c.requiredThreshold.toFixed(3)}
`)
    lines.push(section('Top Cross-source Candidates', blocks.join('\n')))
  }

  if (r && qualityValid && r.relationships.length > 0) {
    const claimById = new Map(r.claims.map((c) => [c.id, c]))
    const evidenceById = new Map(r.evidence.map((e) => [e.id, e]))
    const relBlocks = r.relationships.map((rel, i) => {
      const a = claimById.get(rel.fromClaimId)
      const b = claimById.get(rel.toClaimId)
      const evA = formatEvidenceForReport(a, evidenceById)
      const evB = formatEvidenceForReport(b, evidenceById)
      return `
### Relationship #${i + 1}

Type: ${rel.type}

Claim A: ${a?.statement ?? rel.fromClaimId}
Source A: V${a?.voiceIndex ?? 'N/A'}
Evidence A: ${evA.text}
Timestamp A: ${evA.timestamp}

Claim B: ${b?.statement ?? rel.toClaimId}
Source B: V${b?.voiceIndex ?? 'N/A'}
Evidence B: ${evB.text}
Timestamp B: ${evB.timestamp}

Relationship Proposition: ${rel.explanation}
Confidence: ${rel.confidence}
Verification Score: ${rel.verificationStatus ?? 'N/A'}
`
    })
    lines.push(section('Verified Relationships', relBlocks.join('\n')))
  } else {
    lines.push(
      section(
        'Verified Relationships',
        qualityValid
          ? 'No verified relationships.'
          : `${INVALID_QUALITY_LABEL} (live E2E pipeline did not complete successfully).`,
      ),
    )
  }

  const rejectionDist: Record<string, number> = {
    ALIGNMENT_FAILED: 0,
    DIFFERENT_DIMENSION: 0,
    LOGICAL_GAP: 0,
    TOPIC_ONLY: 0,
    INSUFFICIENT_EVIDENCE: 0,
    SUBJECT_MISMATCH: 0,
    POLARITY_MISMATCH: 0,
    UNKNOWN: 0,
  }
  const rejectionSamples: MultiSourceReasoning['rejectedRelationships'] = r?.rejectedRelationships ?? []
  const diagRejections = d?.relationshipVerificationDiagnostics ?? []
  for (const row of diagRejections) {
    const bucket = rejectionBucket(row.rejectionReason)
    rejectionDist[bucket]++
  }
  for (const row of rejectionSamples) {
    const bucket = rejectionBucket(row.rejectionReason ?? undefined)
    rejectionDist[bucket]++
  }
  if (bundle?.candidateAudit) {
    for (const row of bundle.candidateAudit) {
      if (row.verificationResult === 'REJECT') {
        const bucket = rejectionBucket(row.verificationRejectionReason)
        rejectionDist[bucket]++
      }
    }
  }

  lines.push(section(
    'Rejection Distribution',
    `
- ALIGNMENT_FAILED: ${rejectionDist.ALIGNMENT_FAILED}
- DIFFERENT_DIMENSION: ${rejectionDist.DIFFERENT_DIMENSION}
- LOGICAL_GAP: ${rejectionDist.LOGICAL_GAP}
- TOPIC_ONLY: ${rejectionDist.TOPIC_ONLY}
- INSUFFICIENT_EVIDENCE: ${rejectionDist.INSUFFICIENT_EVIDENCE}
- SUBJECT_MISMATCH: ${rejectionDist.SUBJECT_MISMATCH}
- POLARITY_MISMATCH: ${rejectionDist.POLARITY_MISMATCH}
- UNKNOWN: ${rejectionDist.UNKNOWN}
`,
  ))

  const samples = diagRejections.slice(0, 10)
  if (samples.length > 0) {
    const sampleBlocks = samples.map((row, i) => `
### Rejection Sample ${i + 1}

Claim A: ${row.fromClaimText}
Claim B: ${row.toClaimText}
Expected Type: ${row.proposedType}
Reason: ${row.rejectionReason ?? 'N/A'}
Score: ${row.scores.finalAlignment?.toFixed(3) ?? 'N/A'}
Threshold: ${row.scores.requiredThreshold?.toFixed(3) ?? 'N/A'}
`)
    lines.push(section('Rejection Samples', sampleBlocks.join('\n')))
  }

  if (r?.judgment && qualityValid) {
    const summary = d?.sourceCountSummary
    const propBlocks =
      (d?.judgmentPropositionLineage ?? []).map((p, i) => {
        if (isDefensibleJudgmentProposition(p)) {
          return `
Proposition ${i + 1}: ${p.proposition}
- Cluster: ${p.clusterIds.join(', ') || 'N/A'}
- Relationships: ${p.relationshipIds.join(', ') || 'N/A'}
- Claims: ${p.claimIds.join(', ') || 'N/A'}
- Sources: ${p.sourceIds.join(', ') || 'N/A'}
- Evidence: ${p.evidenceIds.join(', ') || 'N/A'}
- Support: ${p.supportStatus}
`
        }
        if (p.supportStatus === 'PARTIALLY_SUPPORTED') {
          return `
Proposition ${i + 1}: ${p.proposition}
- Support: PARTIALLY_SUPPORTED (no verified lineage)
`
        }
        return `
Proposition ${i + 1}: ${p.proposition}
UNSUPPORTED_JUDGMENT_PROPOSITION
`
      }) ?? []

    lines.push(section(
      'Judgment',
      `
### Final Judgment

${r.judgment.statement}

### Confidence

${r.judgment.confidence}

### Source Coverage

Supporting Sources: ${summary?.relevantSourceCount ?? 'N/A'}
Total Sources: ${summary?.submittedSourceCount ?? snapshot.meta.inputSourceCount}

### Judgment Proposition Lineage

${propBlocks.join('\n') || 'N/A'}
`,
    ))
  } else {
    lines.push(
      section(
        'Judgment',
        qualityValid ? 'No judgment generated.' : `${INVALID_QUALITY_LABEL}`,
      ),
    )
  }

  lines.push(
    section(
      'Emergent',
      !qualityValid
        ? INVALID_QUALITY_LABEL
        : emergentCount > 0
          ? r!
              .insights.map(
                (ins, i) => `
### Emergent #${i + 1}

${ins.statement}
Confidence: ${ins.confidence}
`,
              )
              .join('\n')
          : 'No verified emergent relationships.',
    ),
  )

  const invariants = runInvariantChecks(snapshot)
  lines.push(section(
    'Invariant Checks',
    invariants.map((c) => `- ${c.name}: ${c.status}${c.detail ? ` (${c.detail})` : ''}`).join('\n'),
  ))

  lines.push(section(
    'Unit/Fixture Regression',
    `
| Fixture | Result | Notes |
|---|---|---|
${snapshot.unitRegression
  .map((row) => `| ${row.name} | ${row.result} | ${row.notes ?? ''} |`)
  .join('\n')}
`,
  ))

  const e2e = snapshot.e2eEvaluation
  lines.push(section(
    'E2E Reasoning Evaluation',
    `
| Fixture | Overall | Infrastructure | Reasoning Quality | Notes |
|---|---|---|---|---|
| ${e2e.fixtureId} | ${e2e.result} | ${e2e.infrastructureResult ?? 'N/A'} | ${e2e.reasoningQualityResult ?? 'N/A'} | ${e2e.reason ?? ''} |

CANDIDATE_VERIFICATION_COLLAPSE must never yield overall PASS.
`,
  ))

  const deepDiag = buildDeepDiagnostics(snapshot)
  lines.push(section('Claim Loss Analysis', formatClaimLossSection(deepDiag.claimLossRows)))
  lines.push(
    section('Verification Loss Analysis', formatVerificationLossSection(deepDiag.verificationLossRows)),
  )
  lines.push(
    section('Suspected False Rejections', formatFalseRejectionSection(deepDiag.falseRejectionRows)),
  )
  lines.push(section('E2E Failure Reasons', formatE2eFailureSection(deepDiag.e2eFailureReasons)))

  if (snapshot.extractionCoverage) {
    lines.push(
      section('Extraction Coverage', formatExtractionCoverageSection(snapshot.extractionCoverage)),
    )
  }

  const source2Analysis =
    snapshot.refreshedSources?.find((s) => s.sourceId === 'source_2') ??
    snapshot.refreshedSources?.find((s) => s.sourceId.includes('2'))
  const source2Rows = buildSource2ExtractionRegression({
    source2Analysis,
    reasoning: r,
  })
  lines.push(section('Source 2 Extraction Regression', formatSource2RegressionSection(source2Rows)))

  lines.push(
    section('Relationship Precision Audit', formatRelationshipPrecisionSection(r)),
  )

  lines.push(
    section('Complementary Precision Audit', formatComplementaryPrecisionSection(r)),
  )

  const afterMetrics = collectEvalSummaryMetrics(snapshot)
  const prevSnapshot = previousRawPath ? loadPreviousSnapshot(previousRawPath) : null
  const beforeMetrics = prevSnapshot ? collectEvalSummaryMetrics(prevSnapshot) : null
  lines.push(
    section('BEFORE / AFTER', formatEvalBeforeAfterSection(beforeMetrics, afterMetrics)),
  )

  const prev = previousRawPath ? loadPreviousMetrics(previousRawPath) : null
  if (prev && stats) {
    const cur = {
      generationClaims:
        stats.generationEligible ?? comparable?.generationEligible ?? 0,
      candidates: stats.candidatePairs ?? 0,
      verified: stats.verifiedRelationships ?? 0,
      clusters: stats.relationshipClusters ?? 0,
    }
    lines.push(section(
      'Delta From Previous Run',
      `
| Metric | Previous | Current | Delta |
|---|---:|---:|---:|
| Generation claims | ${prev.generationClaims} | ${cur.generationClaims} | ${cur.generationClaims - prev.generationClaims} |
| Candidates | ${prev.candidates} | ${cur.candidates} | ${cur.candidates - prev.candidates} |
| Verified | ${prev.verified} | ${cur.verified} | ${cur.verified - prev.verified} |
| Clusters | ${prev.clusters} | ${cur.clusters} | ${cur.clusters - prev.clusters} |
`,
    ))
  }

  lines.push(section(
    'Raw Diagnostic Reference',
    `
Full structured diagnostics are stored in \`reports/reasoning-eval-raw.json\`.

Key diagnostic namespaces in raw JSON:
- \`reasoning.diagnostics.pipelineStats\`
- \`reasoning.diagnostics.relevanceFunnel\`
- \`reasoning.diagnostics.candidateFunnel\`
- \`reasoning.diagnostics.evidenceCoverage\`
- \`reasoning.diagnostics.verificationDiagnosticsBundle\`
- \`reasoning.diagnostics.pipelineWarnings\`
`,
  ))

  return lines.join('\n')
}
