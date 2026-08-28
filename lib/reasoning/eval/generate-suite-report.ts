import type { BenchmarkEvalResult } from '@/lib/reasoning/eval/evaluate-benchmark'
import type { ReasoningSuiteSnapshot } from '@/lib/reasoning/eval/types'

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

function evidenceCell(m: BenchmarkEvalResult['metrics']): string {
  return m.evidenceIntegrityPass ? 'PASS' : 'FAIL'
}

function judgmentCell(m: BenchmarkEvalResult['metrics']): string {
  if (m.unsupportedPropositions > 0) return 'UNSUPPORTED'
  if (m.supportedPropositions > 0) return 'SUPPORTED'
  return 'N/A'
}

function fixtureLabel(fixtureId: string, label: string): string {
  if (fixtureId === 'mcp-3video-baseline') return 'MCP Baseline'
  if (fixtureId === 'same-topic-different-claims') return 'Same Topic / Different Claims'
  if (fixtureId === 'mixed-irrelevant') return 'Mixed / Irrelevant'
  return label
}

export function generateReasoningSuiteReport(snapshot: ReasoningSuiteSnapshot): string {
  const lines: string[] = []
  lines.push('# elcanto Reasoning v1 Graduation Report')
  lines.push('')
  lines.push(`Generated At: ${snapshot.generatedAt}`)
  lines.push(`Commit: ${snapshot.commit}`)
  lines.push(`Engine: ${snapshot.engineVersion}`)
  lines.push(`Pipeline Mode: ${snapshot.pipelineMode}`)
  lines.push('')

  lines.push('## Summary')
  lines.push('')
  lines.push('| Fixture | Evidence | Precision | Recall | Judgment | Result |')
  lines.push('|---|---|---:|---:|---|---|')

  for (const r of snapshot.results) {
    lines.push(
      `| ${fixtureLabel(r.fixtureId, r.label)} | ${evidenceCell(r.metrics)} | ${pct(r.metrics.precision)} | ${pct(r.metrics.recall)} | ${judgmentCell(r.metrics)} | ${r.result} |`,
    )
  }

  lines.push('')
  lines.push('## Overall Relationship Quality')
  lines.push('')
  lines.push(`Precision: ${pct(snapshot.aggregatePrecision)}`)
  lines.push(`Recall: ${pct(snapshot.aggregateRecall)}`)
  lines.push('')
  lines.push(`False Agreement: ${snapshot.overallFalseAgreement}`)
  lines.push(`False Divide: ${snapshot.overallFalseDivide}`)
  lines.push(`False Complementary: ${snapshot.overallFalseComplementary}`)
  lines.push('')
  lines.push(`Missed Gold Relationships: ${snapshot.overallMissedGold}`)
  lines.push('')

  lines.push('## Judgment Safety')
  lines.push('')
  lines.push(`Supported: ${snapshot.judgmentSupported}`)
  lines.push(`Unsupported: ${snapshot.judgmentUnsupported}`)
  lines.push(`False relationships used by Judgment: ${snapshot.falseRelationshipsInJudgment}`)
  lines.push('')

  lines.push('## Regression')
  lines.push('')
  const mcp = snapshot.results.find((r) => r.fixtureId === 'mcp-3video-baseline')
  lines.push(`MCP regression: ${snapshot.mcpRegressionResult}`)
  lines.push(
    `Evidence regression: ${snapshot.results.every((r) => r.metrics.evidenceIntegrityPass) ? 'PASS' : 'FAIL'}`,
  )
  lines.push(
    `Relationship regression: ${snapshot.overallFalseAgreement === 0 && snapshot.overallFalseDivide === 0 && snapshot.overallFalseComplementary === 0 ? 'PASS' : 'FAIL'}`,
  )
  lines.push(
    `Judgment regression: ${snapshot.judgmentUnsupported === 0 && snapshot.falseRelationshipsInJudgment === 0 ? 'PASS' : 'FAIL'}`,
  )
  if (mcp?.mcpRegression && mcp.mcpRegression.failureReasons.length > 0) {
    lines.push('')
    lines.push('MCP guard failures:')
    for (const reason of mcp.mcpRegression.failureReasons) {
      lines.push(`- ${reason}`)
    }
  }
  lines.push('')

  lines.push('## Fixture Details')
  lines.push('')

  for (const r of snapshot.results) {
    lines.push(`### ${fixtureLabel(r.fixtureId, r.label)} (${r.fixtureId})`)
    lines.push('')
    lines.push(`Result: **${r.result}**`)
    if (r.failureReasons.length > 0) {
      lines.push('')
      lines.push('Failure reasons:')
      for (const reason of r.failureReasons) {
        lines.push(`- ${reason}`)
      }
    }
    if (r.blockers.length > 0) {
      lines.push('')
      lines.push('Blockers:')
      for (const b of r.blockers) {
        lines.push(`- ${b}`)
      }
    }
    if (r.pipelineDiagnosis.length > 0) {
      lines.push('')
      lines.push('Pipeline diagnosis:')
      for (const d of r.pipelineDiagnosis) {
        lines.push(`- ${d}`)
      }
    }
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|---|---:|')
    lines.push(`| Total extracted claims | ${r.metrics.totalExtractedClaims} |`)
    lines.push(`| Evidence-supported claims | ${r.metrics.evidenceSupportedClaims} |`)
    lines.push(`| Relevance usable | ${r.metrics.relevanceUsable} |`)
    lines.push(`| Generation eligible | ${r.metrics.generationEligible} |`)
    lines.push(`| Candidates | ${r.metrics.candidates} |`)
    lines.push(`| Verified | ${r.metrics.verified} |`)
    lines.push(`| Agreement | ${r.metrics.agreement} |`)
    lines.push(`| Divide | ${r.metrics.divide} |`)
    lines.push(`| Complementary | ${r.metrics.complementary} |`)
    lines.push(`| Agreement precision | ${pct(r.metrics.agreementPrecision)} |`)
    lines.push(`| Divide precision | ${pct(r.metrics.dividePrecision)} |`)
    lines.push(`| Complementary precision | ${pct(r.metrics.complementaryPrecision)} |`)
    lines.push(`| False Agreement | ${r.metrics.falseAgreement} |`)
    lines.push(`| False Divide | ${r.metrics.falseDivide} |`)
    lines.push(`| False Complementary | ${r.metrics.falseComplementary} |`)
    lines.push(`| Missed expected relationships | ${r.metrics.missedExpectedRelationships} |`)
    lines.push(`| Final judgment | ${r.metrics.finalJudgment ?? 'N/A'} |`)
    lines.push(`| Supported propositions | ${r.metrics.supportedPropositions} |`)
    lines.push(`| Unsupported propositions | ${r.metrics.unsupportedPropositions} |`)
    lines.push(`| Judgment confidence | ${r.metrics.judgmentConfidence} |`)
    lines.push(`| Judgment lineage | ${r.metrics.judgmentLineageStatus} |`)
    lines.push(`| Reasoning quality (E2E) | ${r.metrics.reasoningQuality} |`)
    lines.push('')

    if (r.metrics.participatingSourceIds.length > 0) {
      lines.push(`Participating sources: ${r.metrics.participatingSourceIds.join(', ')}`)
    }
    if (r.metrics.excludedSourceIds.length > 0) {
      lines.push('')
      lines.push('Excluded / non-generating sources:')
      for (const ex of r.metrics.excludedSourceIds) {
        lines.push(`- ${ex.sourceId}: ${ex.reason ?? 'excluded'}`)
      }
    }
    if (r.metrics.aggregationInvariantFailures.length > 0) {
      lines.push('')
      lines.push('Aggregation invariant failures:')
      for (const inv of r.metrics.aggregationInvariantFailures) {
        lines.push(`- ${inv}`)
      }
    }
    lines.push('')
  }

  if (snapshot.reproducibility) {
    lines.push('## Standalone vs Suite Reproducibility')
    lines.push('')
    const fmt = (s?: import('@/lib/reasoning/eval/reproducibility').McpReproducibilitySnapshot) => {
      if (!s) return 'N/A'
      return `claims=${s.claims} genEligible=${s.generationEligible} candidates=${s.candidates} verified=${s.verified} agreement=${s.agreement} divide=${s.divide} judgment=${s.judgmentConfidence} evidence=${s.evidenceIntegrityPass ? 'PASS' : 'FAIL'} model=${s.model} temp=${s.temperature} seed=${s.seed}`
    }
    lines.push(`Standalone before: ${fmt(snapshot.reproducibility.standaloneBefore)}`)
    lines.push(`Suite MCP: ${fmt(snapshot.reproducibility.suiteMcp)}`)
    lines.push(`Standalone after: ${fmt(snapshot.reproducibility.standaloneAfter)}`)
    lines.push('')
    if (snapshot.reproducibility.standaloneBeforeVsSuiteDiffs?.length) {
      lines.push('Before vs Suite diffs:')
      for (const d of snapshot.reproducibility.standaloneBeforeVsSuiteDiffs) {
        lines.push(`- ${d}`)
      }
      lines.push('')
    }
    if (snapshot.reproducibility.standaloneBeforeVsAfterDiffs?.length) {
      lines.push('Before vs After diffs:')
      for (const d of snapshot.reproducibility.standaloneBeforeVsAfterDiffs) {
        lines.push(`- ${d}`)
      }
      lines.push('')
    }
    if (snapshot.reproducibility.suiteVsStandaloneAfterDiffs?.length) {
      lines.push('Suite vs After diffs:')
      for (const d of snapshot.reproducibility.suiteVsStandaloneAfterDiffs) {
        lines.push(`- ${d}`)
      }
      lines.push('')
    }
  }

  lines.push('## Metric Population Audit')
  lines.push('')
  lines.push('| Fixture | Extracted | Evidence-supported | Relevance usable | Gen eligible | Candidates | Verified | Invariant |')
  lines.push('|---|---:|---:|---:|---:|---:|---:|---|')
  for (const r of snapshot.results) {
    const inv =
      r.metrics.aggregationInvariantFailures.length > 0
        ? 'FAIL'
        : r.metrics.evidenceSupportedClaims <= r.metrics.totalExtractedClaims
          ? 'PASS'
          : 'FAIL'
    lines.push(
      `| ${fixtureLabel(r.fixtureId, r.label)} | ${r.metrics.totalExtractedClaims} | ${r.metrics.evidenceSupportedClaims} | ${r.metrics.relevanceUsable} | ${r.metrics.generationEligible} | ${r.metrics.candidates} | ${r.metrics.verified} | ${inv} |`,
    )
  }
  lines.push('')

  if (snapshot.goldRecallTraces?.length) {
    lines.push('## Gold Recall Trace')
    lines.push('')
    for (const t of snapshot.goldRecallTraces) {
      lines.push(`### ${t.fixtureId}: ${t.sourceA} ↔ ${t.sourceB}`)
      lines.push('')
      lines.push(`- dimension A/B: ${t.dimensionA} / ${t.dimensionB}`)
      lines.push(`- dimensionCompatibility: ${t.dimensionCompatibility}`)
      lines.push(`- propositionTarget A/B: ${t.propositionTargetA} / ${t.propositionTargetB}`)
      lines.push(`- polarity A/B: ${t.polarityA} / ${t.polarityB}`)
      lines.push(`- sharedProposition: ${t.sharedProposition || 'none'}`)
      lines.push(`- entailedByA: ${t.entailedByA}, entailedByB: ${t.entailedByB}, addedInference: ${t.addedInference}`)
      lines.push(`- PRE_LLM: ${t.preLlmVerdict}`)
      if (t.rejectingGate) lines.push(`- rejectingGate: ${t.rejectingGate} (${t.rejectingFunction ?? 'n/a'})`)
      lines.push('')
    }
  }

  if (snapshot.precisionRegressionGuard) {
    lines.push('## Precision Regression Guard')
    lines.push('')
    lines.push(`Result: **${snapshot.precisionRegressionGuard.result}**`)
    lines.push(`Same Topic Different Claims: ${snapshot.precisionRegressionGuard.sameTopicPass ? 'PASS' : 'FAIL'}`)
    lines.push(`False Agreement: ${snapshot.precisionRegressionGuard.falseAgreement}`)
    lines.push(`False Divide: ${snapshot.precisionRegressionGuard.falseDivide}`)
    lines.push(`False Complementary: ${snapshot.precisionRegressionGuard.falseComplementary}`)
    lines.push('')
  }

  if (snapshot.unitRegression.length > 0) {
    lines.push('## Unit Regression')
    lines.push('')
    lines.push('| Case | Result |')
    lines.push('|---|---|')
    for (const u of snapshot.unitRegression) {
      lines.push(`| ${u.name} | ${u.result} |`)
    }
    lines.push('')
  }

  lines.push('==================================================')
  lines.push('V1 EXIT STATUS')
  lines.push('==================================================')
  lines.push('')
  lines.push(`**${snapshot.v1ExitStatus}**`)
  lines.push('')

  if (snapshot.suiteBlockers.length > 0) {
    lines.push('## Remaining BLOCKERS')
    lines.push('')
    for (const b of snapshot.suiteBlockers) {
      lines.push(`- BLOCKER: ${b}`)
    }
    lines.push('')
  }

  if (snapshot.suiteV2Backlog.length > 0) {
    lines.push('## V2 Backlog')
    lines.push('')
    for (const item of snapshot.suiteV2Backlog) {
      lines.push(`- ${item}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('Raw: `reports/reasoning-suite-raw.json`')
  lines.push('Per-fixture LIVE snapshots: `reports/benchmark/<fixtureId>-raw.json`')

  return lines.join('\n')
}
