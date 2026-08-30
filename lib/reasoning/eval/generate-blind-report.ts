import type { BlindTestSnapshot } from '@/lib/reasoning/eval/run-blind-test'

function pct(n: number | null): string {
  if (n === null) return 'N/A'
  return `${Math.round(n * 100)}%`
}

export function generateBlindTestReport(snapshot: BlindTestSnapshot): string {
  const lines: string[] = []

  lines.push('# elcanto Reasoning v1 Blind Test Report')
  lines.push('')
  lines.push(`Generated At: ${snapshot.generatedAt}`)
  lines.push(`Engine: ${snapshot.engine}`)
  lines.push(`Commit: ${snapshot.commit}`)
  lines.push(`Baseline Commit: ${snapshot.baselineCommit}`)
  lines.push('')
  lines.push('```text')
  lines.push('BLIND TEST')
  lines.push('')
  lines.push(`Precision: ${snapshot.aggregate.precisionLabel}`)
  lines.push(`Recall: ${snapshot.aggregate.recallLabel}`)
  lines.push('')
  lines.push(`False Agreement: ${snapshot.aggregate.falseAgreement}`)
  lines.push(`False Divide: ${snapshot.aggregate.falseDivide}`)
  lines.push(`False Complementary: ${snapshot.aggregate.falseComplementary}`)
  lines.push('')
  lines.push(
    `Evidence Integrity: ${snapshot.fixtures.every((f) => f.evidenceIntegrity === 'PASS') ? 'PASS' : 'FAIL'}`,
  )
  lines.push(
    `Judgment Grounding: ${snapshot.aggregate.unsupportedJudgment === 0 && snapshot.aggregate.falseRelationshipsInJudgment === 0 ? 'PASS' : 'FAIL'}`,
  )
  lines.push('')
  lines.push(
    `Relationship Stability: ${snapshot.stabilitySummary.relationshipStabilityPass ? 'PASS' : 'FAIL'}`,
  )
  lines.push(`Pipeline Stability: ${snapshot.stabilitySummary.pipelineStabilityPass ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push(`Claim Population Drift: ${snapshot.stabilitySummary.claimPopulationDrift} fixtures`)
  lines.push(`Relevance Collapse: ${snapshot.stabilitySummary.relevanceCollapse} fixtures`)
  lines.push(`Candidate Collapse: ${snapshot.stabilitySummary.candidateCollapse} fixtures`)
  lines.push(`Relationship Drift: ${snapshot.stabilitySummary.relationshipDrift} fixtures`)
  lines.push(`Judgment Drift: ${snapshot.stabilitySummary.judgmentDrift} fixtures`)
  lines.push('```')
  lines.push('')
  lines.push('## Exit Status')
  lines.push('')
  lines.push(`**${snapshot.exitStatus}**`)
  lines.push('')
  lines.push('## Aggregate Metrics')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Gold relationships | ${snapshot.aggregate.totalGoldRelationships} |`)
  lines.push(`| Predicted relationships | ${snapshot.aggregate.totalPredictedRelationships} |`)
  lines.push(`| True positive | ${snapshot.aggregate.truePositive} |`)
  lines.push(`| False positive | ${snapshot.aggregate.falsePositive} |`)
  lines.push(`| False negative | ${snapshot.aggregate.falseNegative} |`)
  lines.push(`| Precision | ${snapshot.aggregate.precisionLabel} (${pct(snapshot.aggregate.precision)}) |`)
  lines.push(`| Recall | ${snapshot.aggregate.recallLabel} (${pct(snapshot.aggregate.recall)}) |`)
  lines.push('')
  lines.push('## Fixture Results')
  lines.push('')
  lines.push('| Fixture | Category | Evidence | Relationship | Pipeline | Stability | Attribution |')
  lines.push('|---|---|---|---|---|---|---|')

  for (const f of snapshot.fixtures) {
    lines.push(
      `| ${f.fixtureId} | ${f.category} | ${f.evidenceIntegrity} | ${f.relationshipQuality} | ${f.pipelineHealth} | ${f.stability.relationshipConsistency} | ${f.failureAttribution} |`,
    )
  }

  lines.push('')
  lines.push('## Fixture Funnel (last run per fixture)')
  lines.push('')

  for (const f of snapshot.fixtures) {
    const last = f.runs[f.runs.length - 1]
    lines.push(`### ${f.fixtureId}`)
    lines.push('')
    lines.push('| Stage | Count |')
    lines.push('|---|---:|')
    lines.push(`| extractedClaims | ${last.funnel.extractedClaims} |`)
    lines.push(`| evidenceSupportedClaims | ${last.funnel.evidenceSupportedClaims} |`)
    lines.push(`| relevanceUsable | ${last.funnel.relevanceUsable} |`)
    lines.push(`| generationEligible | ${last.funnel.generationEligible} |`)
    lines.push(`| candidatePairs | ${last.funnel.candidatePairs} |`)
    lines.push(`| verifiedRelationships | ${last.funnel.verifiedRelationships} |`)
    lines.push(`| agreement | ${last.funnel.agreement} |`)
    lines.push(`| divide | ${last.funnel.divide} |`)
    lines.push(`| complementary | ${last.funnel.complementary} |`)
    lines.push(`| judgment confidence | ${last.funnel.judgmentConfidence} |`)
    lines.push('')
    if (f.stability.flags.length > 0) {
      lines.push(`Stability flags: ${f.stability.flags.join(', ')}`)
      lines.push('')
    }
    if (f.stability.goldRelationshipStability.length > 0) {
      lines.push('Gold relationship stability:')
      for (const g of f.stability.goldRelationshipStability) {
        lines.push(
          `- ${g.expectedType} ${g.sources.join('↔')}: ${g.consistencyLabel}${g.typeDrift ? ' (type drift)' : ''}`,
        )
      }
      lines.push('')
    }
    if (f.stability.falseRelationshipCount > 0) {
      lines.push(
        `False relationships across runs: ${f.stability.falseRelationshipCount} (${f.stability.falseRelationshipRuns} runs)`,
      )
      lines.push('')
    }
    lines.push('3-run variance:')
    lines.push(`- claim count variance: ${f.stability.claimCountVariance}`)
    lines.push(`- generation eligible variance: ${f.stability.generationEligibleVariance}`)
    lines.push(`- candidate variance: ${f.stability.candidateVariance}`)
    lines.push(`- judgment consistency: ${f.stability.judgmentConsistency}`)
    lines.push('')
  }

  lines.push('## MCP Reproducibility (5 runs)')
  lines.push('')
  lines.push('| Run | Claims | Gen Eligible | Candidates | Verified | Agreement |')
  lines.push('|---:|---:|---:|---:|---:|---:|')
  for (const r of snapshot.mcpReproducibility.runs) {
    lines.push(
      `| ${r.label} | ${r.claims} | ${r.generationEligible} | ${r.candidates} | ${r.verified} | ${r.agreement} |`,
    )
  }
  lines.push('')
  lines.push('Diagnosis (no code changes applied):')
  for (const d of snapshot.mcpReproducibility.diagnosis) {
    lines.push(`- ${d}`)
  }
  lines.push('')
  lines.push('## Graduation Suite Regression')
  lines.push('')
  lines.push(`| Graduation PASS | ${snapshot.baselineRegression.graduationSuitePass} |`)
  lines.push(`| V1 Exit Status | ${snapshot.baselineRegression.suiteV1ExitStatus} |`)
  lines.push(`| Commit matches baseline | ${snapshot.baselineRegression.commitMatch} |`)
  lines.push('')
  lines.push('## Failure Attribution')
  lines.push('')
  if (snapshot.failureAttributions.length === 0) {
    lines.push('No failures attributed.')
  } else {
    for (const a of snapshot.failureAttributions) {
      lines.push(`- **${a.fixtureId}** — ${a.stage}: ${a.detail} (${a.frequency})`)
    }
  }
  lines.push('')
  lines.push('## Remediation Candidates (not applied in this task)')
  lines.push('')
  for (const r of snapshot.remediationCandidates) {
    lines.push(`### ${r.stage}`)
    lines.push(`- Hypothesis: ${r.hypothesis}`)
    lines.push(`- Regression risk: ${r.regressionRisk}`)
    lines.push('')
  }
  lines.push('---')
  lines.push(`Raw: \`${'reports/reasoning-v1-blind-test-raw.json'}\``)

  return lines.join('\n')
}
