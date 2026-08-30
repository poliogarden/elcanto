import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import type { AbExperimentSummary } from '@/lib/experiments/architecture-ab/types'

export async function writeArchitectureAbReports(summary: AbExperimentSummary): Promise<void> {
  const reportsDir = path.join(process.cwd(), 'reports')
  await mkdir(reportsDir, { recursive: true })

  await writeFile(
    path.join(reportsDir, 'architecture-ab-results.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  )

  const decisionMd = buildDecisionMarkdown(summary)
  await writeFile(path.join(reportsDir, 'architecture-decision.md'), decisionMd, 'utf8')

  const testMd = buildAbTestMarkdown(summary)
  await writeFile(path.join(reportsDir, 'architecture-ab-test.md'), testMd, 'utf8')

  const baselineMd = [
    '# Direct Cross-Source Synthesis Baseline',
    '',
    '**Version:** direct-baseline-1.0',
    '',
    '## Flow',
    '',
    'Central Question → evidence retrieval → per-source answer → cross-source synthesis → validation',
    '',
    '## Explicitly NOT used',
    '',
    '- Relationship candidate generator',
    '- Proposition verifier pipeline',
    '- Agreement/Divide/Complementary engines',
    '- Relationship consolidation',
    '- Judgment gate on verified relationships',
    '',
    '## Modules',
    '',
    '- lib/experiments/direct-synthesis/evidence-retrieval.ts',
    '- lib/experiments/direct-synthesis/per-source-answer.ts',
    '- lib/experiments/direct-synthesis/cross-source-synthesis.ts',
    '- lib/experiments/direct-synthesis/evidence-validation.ts',
    '- lib/experiments/direct-synthesis/pipeline.ts',
    '',
    '## Typical LLM calls (3 sources)',
    '',
    '4 calls: 3 per-source + 1 cross-source',
    '',
  ].join('\n')
  await writeFile(path.join(reportsDir, 'direct-synthesis-baseline.md'), baselineMd, 'utf8')
}

function buildDecisionMarkdown(summary: AbExperimentSummary): string {
  const d = summary.decision
  const a = summary.aggregate
  return `# Architecture Decision

**DECISION: ${d.decision}**

**CONFIDENCE: ${d.confidence}**${d.provisional ? ' (PROVISIONAL)' : ''}

## WHY

${d.why.map((w) => `- ${w}`).join('\n')}

## WHAT A DID BETTER

${d.whatABetter.map((w) => `- ${w}`).join('\n') || '- See per-case scores'}

## WHAT B DID BETTER

${d.whatBBetter.map((w) => `- ${w}`).join('\n') || '- See per-case scores'}

## QUALITY

| | A | B |
|--|--|--|
| Avg weighted score | ${a.avgWeightedA.toFixed(2)} | ${a.avgWeightedB.toFixed(2)} |
| User pref wins | ${a.aWins} | ${a.bWins} |
| Ties | ${a.ties} | |
| Neither | ${a.neither} | |

## EVIDENCE

| Precision | A | B |
|-----------|--|--|
| Average | ${a.avgPrecisionA.toFixed(2)} | ${a.avgPrecisionB.toFixed(2)} |

## RECALL

| | A | B |
|--|--|--|
| Average | ${a.avgRecallA.toFixed(2)} | ${a.avgRecallB.toFixed(2)} |

## FALSE RELATIONSHIPS / HALLUCINATIONS

See per-case inventedRelationship* and hallucinationPenaltyB in architecture-ab-results.json

## LATENCY (ms)

| | A | B |
|--|--|--|
| Average | ${Math.round(a.avgLatencyA)} | ${Math.round(a.avgLatencyB)} |

## COST (USD est.)

| | A | B |
|--|--|--|
| Average | ${a.avgCostA.toFixed(4)} | ${a.avgCostB.toFixed(4)} |

## COMPLEXITY

### A (V2.2)

Stages: ${summary.complexity.architectureA.pipelineStages}, modules: ${summary.complexity.architectureA.reasoningModules}, typical LLM calls (3 src): ${summary.complexity.architectureA.llmCallsTypical3Source}

### B (Direct)

Stages: ${summary.complexity.architectureB.pipelineStages}, modules: ${summary.complexity.architectureB.reasoningModules}, typical LLM calls (3 src): ${summary.complexity.architectureB.llmCallsTypical3Source}

## OBSERVED FAILURE MODES

### A

${summary.complexity.architectureA.failureStates.map((s) => `- ${s}`).join('\n')}

### B

${summary.complexity.architectureB.failureStates.map((s) => `- ${s}`).join('\n')}

## WHAT TO KEEP / DELETE / REUSE

- **KEEP:** Shared ingestion, evidence timestamps, cost telemetry, acceptance harness
- **DELETE (if SIMPLIFY):** Candidate funnel as primary reasoner — decision-dependent
- **REUSE:** Direct per-source answers + cross-source step as primary; V2 verifier as optional layer (HYBRID)

## NEXT ARCHITECTURE

${d.nextArchitecture}

## DATA COVERAGE

- Real YouTube sets run: ${d.realSetsRun}
- Synthetic structured sets run: ${d.syntheticSetsRun}

## If we were starting elcanto today

${d.decision === 'SIMPLIFY' ? 'Build question-first direct synthesis with evidence validation; add relationship verification only where needed.' : d.decision === 'KEEP_V2' ? 'Still build relationship-first core — complexity pays off on precision.' : 'Build direct synthesis first, use relationship engine as verification/explanation layer — not primary reasoner.'}
`
}

function buildAbTestMarkdown(summary: AbExperimentSummary): string {
  const rows = summary.cases.map((c) => {
    return `| ${c.caseId} | ${c.weightedScoreA.toFixed(2)} | ${c.weightedScoreB.toFixed(2)} | ${c.userPreference} | ${c.architectureA.costSummary.totalEstimatedCostUsd?.toFixed(4) ?? '—'} | ${c.architectureB.costSummary.totalEstimatedCostUsd?.toFixed(4) ?? '—'} | ${c.architectureA.timingMs.totalMs} | ${c.architectureB.timingMs.totalMs} |`
  })

  return `# Architecture A/B Test

**Run:** ${summary.runAt}

**DECISION: ${summary.decision.decision}** (${summary.decision.confidence})

## Summary table

| CASE | A SCORE | B SCORE | USER PREF | A COST | B COST | A TIME ms | B TIME ms |
|------|---------|---------|-----------|--------|--------|-----------|-----------|
${rows.join('\n')}

## Aggregate

- A wins: ${summary.aggregate.aWins}
- B wins: ${summary.aggregate.bWins}
- Ties: ${summary.aggregate.ties}
- Neither: ${summary.aggregate.neither}

Raw outputs: reports/architecture-ab/case-*-a.json and case-*-b.json
`
}
