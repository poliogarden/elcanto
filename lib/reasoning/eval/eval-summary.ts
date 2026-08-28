import type { ExtractionCoverageDiagnostics } from '@/lib/pipeline/extraction-diagnostics'
import { auditComplementaryRelationships } from '@/lib/reasoning/complementary-alignment'
import { isDefensibleJudgmentProposition } from '@/lib/reasoning/judgment-lineage'
import { auditRelationshipPrecision } from '@/lib/reasoning/proposition-alignment'
import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export type EvalSummaryMetrics = {
  meaningfulSections: number
  sectionsWithClaims: number
  emptyMeaningfulSections: number
  extractionCoveragePct: number
  totalClaims: number
  evidenceSupported: number
  evidenceSupportedRatio: number
  noEvidence: number
  relevanceUsable: number
  generationEligible: number
  candidates: number
  verified: number
  clusters: number
  supportedPropositions: number
  unsupportedPropositions: number
  reasoningQuality: string
  precisionVerified: number
  precisionValid: number
  precisionFalseAgreement: number
  precisionUncertain: number
  precisionEstimated: number
  complementaryValid: number
  complementaryFalse: number
  agreementCount: number
  complementaryCount: number
  judgmentSupported: boolean
  judgmentConfidence: string
}

export function collectEvalSummaryMetrics(snapshot: ReasoningEvalSnapshot): EvalSummaryMetrics {
  const r = snapshot.reasoning
  const stats = r?.diagnostics?.pipelineStats
  const ec = snapshot.extractionCoverage
  const evidenceCov = r?.diagnostics?.evidenceCoverage
  const comparable = r?.diagnostics?.comparableClaimFunnel
  const propositions = r?.diagnostics?.judgmentPropositionLineage ?? []
  const precisionAudit = auditRelationshipPrecision(
    (r?.relationships ?? []).map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    r?.claims ?? [],
  )
  const complementaryAudit = auditComplementaryRelationships(
    (r?.relationships ?? []).map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    r?.claims ?? [],
  )
  const relationships = r?.relationships ?? []

  const totalClaims = r?.claims.length ?? 0
  const evidenceSupported = evidenceCov
    ? evidenceCov.directEvidence + evidenceCov.paraphraseSupported + evidenceCov.contextSupported
    : 0
  const noEvidence = evidenceCov?.noEvidence ?? 0
  const evidenceSupportedRatio = totalClaims > 0 ? evidenceSupported / totalClaims : 0

  return {
    meaningfulSections: ec?.meaningfulSections ?? 0,
    sectionsWithClaims: ec?.sectionsWithClaims ?? 0,
    emptyMeaningfulSections: ec?.emptyMeaningfulSections ?? 0,
    extractionCoveragePct: Math.round((ec?.coverageRatio ?? 0) * 100),
    totalClaims,
    evidenceSupported,
    evidenceSupportedRatio: Math.round(evidenceSupportedRatio * 100) / 100,
    noEvidence,
    relevanceUsable: stats?.funnelFinalUsable ?? 0,
    generationEligible: comparable?.generationEligible ?? stats?.generationEligible ?? 0,
    candidates: stats?.candidatePairs ?? 0,
    verified: stats?.verifiedRelationships ?? 0,
    clusters: stats?.relationshipClusters ?? 0,
    supportedPropositions: propositions.filter((p) => p.supportStatus === 'SUPPORTED').length,
    unsupportedPropositions: propositions.filter((p) => p.supportStatus === 'UNSUPPORTED').length,
    reasoningQuality: snapshot.e2eEvaluation.reasoningQualityResult ?? 'N/A',
    precisionVerified: precisionAudit.verified,
    precisionValid: precisionAudit.auditedValid,
    precisionFalseAgreement: precisionAudit.falseAgreement,
    precisionUncertain: precisionAudit.uncertain,
    precisionEstimated: Math.round(precisionAudit.estimatedPrecision * 100) / 100,
    complementaryValid: complementaryAudit.valid,
    complementaryFalse: complementaryAudit.falseComplementary,
    agreementCount: relationships.filter((rel) => rel.type === 'AGREEMENT').length,
    complementaryCount: relationships.filter((rel) => rel.type === 'COMPLEMENTARY').length,
    judgmentSupported:
      propositions.length > 0 &&
      isDefensibleJudgmentProposition(propositions[0]) &&
      r?.judgment != null,
    judgmentConfidence: r?.judgment?.confidence ?? 'N/A',
  }
}

export function formatEvalBeforeAfterSection(
  before: EvalSummaryMetrics | null,
  after: EvalSummaryMetrics,
): string {
  const row = (label: string, b: number | string, a: number | string) =>
    `| ${label} | ${b} | ${a} | ${typeof b === 'number' && typeof a === 'number' ? a - b : '—'} |`

  const b = before ?? {
    meaningfulSections: 'N/A',
    sectionsWithClaims: 'N/A',
    emptyMeaningfulSections: 'N/A',
    extractionCoveragePct: 'N/A',
    totalClaims: 'N/A',
    evidenceSupported: 'N/A',
    evidenceSupportedRatio: 'N/A',
    noEvidence: 'N/A',
    relevanceUsable: 'N/A',
    generationEligible: 'N/A',
    candidates: 'N/A',
    verified: 'N/A',
    clusters: 'N/A',
    supportedPropositions: 'N/A',
    unsupportedPropositions: 'N/A',
    reasoningQuality: 'N/A',
    precisionVerified: 'N/A',
    precisionValid: 'N/A',
    precisionFalseAgreement: 'N/A',
    precisionUncertain: 'N/A',
    precisionEstimated: 'N/A',
    complementaryValid: 'N/A',
    complementaryFalse: 'N/A',
    agreementCount: 'N/A',
    complementaryCount: 'N/A',
    judgmentSupported: 'N/A',
    judgmentConfidence: 'N/A',
  }

  return `
### EXTRACTION

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Meaningful sections', b.meaningfulSections, after.meaningfulSections)}
${row('Sections with claims', b.sectionsWithClaims, after.sectionsWithClaims)}
${row('Empty meaningful sections', b.emptyMeaningfulSections, after.emptyMeaningfulSections)}
${row('Coverage %', b.extractionCoveragePct, after.extractionCoveragePct)}

### CLAIMS

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Total claims', b.totalClaims, after.totalClaims)}
${row('Evidence-supported', b.evidenceSupported, after.evidenceSupported)}
${row('Evidence-supported ratio', b.evidenceSupportedRatio, after.evidenceSupportedRatio)}
${row('NO_EVIDENCE', b.noEvidence, after.noEvidence)}

### PIPELINE

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Relevance usable', b.relevanceUsable, after.relevanceUsable)}
${row('Generation eligible', b.generationEligible, after.generationEligible)}
${row('Candidates', b.candidates, after.candidates)}
${row('Verified', b.verified, after.verified)}
${row('Clusters', b.clusters, after.clusters)}

### JUDGMENT

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Supported propositions', b.supportedPropositions, after.supportedPropositions)}
${row('Unsupported propositions', b.unsupportedPropositions, after.unsupportedPropositions)}
${row('Reasoning Quality', b.reasoningQuality, after.reasoningQuality)}

### RELATIONSHIP PRECISION

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Audited Valid', b.precisionValid, after.precisionValid)}
${row('False Agreement', b.precisionFalseAgreement, after.precisionFalseAgreement)}
${row('Uncertain', b.precisionUncertain, after.precisionUncertain)}
${row('Estimated Precision', b.precisionEstimated, after.precisionEstimated)}

### RELATIONSHIP TYPES

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Agreement', b.agreementCount, after.agreementCount)}
${row('Complementary', b.complementaryCount, after.complementaryCount)}
${row('False Complementary', b.complementaryFalse, after.complementaryFalse)}

### FINAL JUDGMENT

| Metric | BEFORE | AFTER | Delta |
|---|---:|---:|---:|
${row('Judgment supported', b.judgmentSupported, after.judgmentSupported)}
${row('Confidence', b.judgmentConfidence, after.judgmentConfidence)}
`
}

export function formatComplementaryPrecisionSection(
  reasoning: MultiSourceReasoning | null,
): string {
  if (!reasoning) return 'No reasoning output.'
  const audit = auditComplementaryRelationships(
    reasoning.relationships.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    reasoning.claims,
  )
  const rows = audit.entries
    .map((e) => `| ${e.id} | ${e.assessedLabel} |`)
    .join('\n')
  return `
Complementary Valid: ${audit.valid}
False Complementary: ${audit.falseComplementary}

| ID | Audit |
|---|---|
${rows || 'No complementary relationships.'}
`
}

export function formatRelationshipPrecisionSection(
  reasoning: MultiSourceReasoning | null,
): string {
  if (!reasoning) return 'No reasoning output.'
  const audit = auditRelationshipPrecision(
    reasoning.relationships.map((rel) => ({
      id: rel.id,
      type: rel.type,
      fromClaimId: rel.fromClaimId,
      toClaimId: rel.toClaimId,
      explanation: rel.explanation,
    })),
    reasoning.claims,
  )

  const rows = audit.entries
    .map(
      (e) =>
        `| ${e.relationshipId} | ${e.type} | ${e.assessedLabel} | ${e.dimensionA} / ${e.dimensionB} | ${e.sharedProposition.slice(0, 60) || '—'} |`,
    )
    .join('\n')

  return `
Verified: ${audit.verified}
Audited Valid: ${audit.auditedValid}
False Agreement: ${audit.falseAgreement}
Uncertain: ${audit.uncertain}
Estimated Precision: ${(audit.estimatedPrecision * 100).toFixed(1)}%

| ID | Type | Audit | Dimensions | Shared Proposition |
|---|---|---|---|---|
${rows}

Regression failures: ${audit.regressionFailures.length === 0 ? 'none' : audit.regressionFailures.join('; ')}
`
}

export function formatExtractionCoverageSection(ec: ExtractionCoverageDiagnostics): string {
  const typeRows = ec.propositionTypeCoverage
    .map(
      (t) =>
        `| ${t.type} | ${t.detectedEvidenceSections} | ${t.extractedClaims} | ${t.missedSections.length} |`,
    )
    .join('\n')

  const emptyRows =
    ec.emptyClaimSections.length === 0
      ? 'No empty meaningful sections.'
      : ec.emptyClaimSections
          .slice(0, 12)
          .map(
            (e) =>
              `- ${e.sourceId}/${e.sectionId}: ${e.reason} — ${e.summarySnippet.slice(0, 80)}`,
          )
          .join('\n')

  return `
Meaningful sections: ${ec.meaningfulSections}
Sections with claims: ${ec.sectionsWithClaims}
Empty meaningful sections: ${ec.emptyMeaningfulSections}
Coverage ratio: ${(ec.coverageRatio * 100).toFixed(1)}%

### Proposition type coverage

| Type | Detected sections | Extracted claims | Missed sections |
|---|---:|---:|---:|
${typeRows}

### EMPTY_CLAIM_SECTION diagnostics

${emptyRows}
`
}
