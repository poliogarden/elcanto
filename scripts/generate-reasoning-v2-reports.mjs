/**
 * Generates Reasoning V2 deliverable reports from blind test raw JSON + V1 baseline.
 * Usage: node scripts/generate-reasoning-v2-reports.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const v1BaselinePath = join(root, 'tests/reasoning/blind/baseline-freeze.json')
const v1RawPath = join(root, 'reports/reasoning-v1-blind-test-raw.json')
const v2RawPath = join(root, 'reports/reasoning-v2-final-raw.json')

function readJson(path) {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function pct(n) {
  if (n === null || n === undefined) return 'N/A'
  return `${Math.round(n * 100)}%`
}

function goldStabilityRows(fixtures) {
  const rows = []
  for (const f of fixtures) {
    for (const gold of f.goldRelationshipCount ? [f] : []) {
      const stable = f.stability?.goldRelationshipStability ?? []
      for (const g of stable) {
        rows.push(
          `| ${f.fixtureId} | ${g.type} | ${g.detectedRuns}/${f.runs.length} | ${g.stable ? 'STABLE' : 'FAIL'} |`,
        )
      }
    }
  }
  return rows
}

function main() {
  const baseline = readJson(v1BaselinePath)
  const v1Raw = readJson(v1RawPath)
  const v2Raw = readJson(v2RawPath)

  mkdirSync(join(root, 'reports'), { recursive: true })

  const v2Agg = v2Raw?.aggregate
  const v1Agg = v1Raw?.aggregate ?? baseline?.blindTest

  const failureMatrix = [
    '# Reasoning V2 Failure Matrix',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## V1 baseline (frozen)',
    '',
    '| Metric | V1 |',
    '|--------|-----|',
    `| Engine | ${baseline?.engine ?? 'reasoning-v2.1'} |`,
    `| Blind Precision | ${pct(baseline?.blindTest?.precision)} |`,
    `| Blind Recall | ${pct(baseline?.blindTest?.recall)} |`,
    `| False Agreement | ${baseline?.blindTest?.falseAgreement ?? 0} |`,
    `| False Divide | ${baseline?.blindTest?.falseDivide ?? 0} |`,
    `| False Complementary | ${baseline?.blindTest?.falseComplementary ?? 0} |`,
    '',
    '## V2 current run',
    '',
    v2Raw
      ? [
          '| Metric | V2 |',
          '|--------|-----|',
          `| Engine | ${v2Raw.engine} |`,
          `| Blind Precision | ${v2Raw.aggregate.precisionLabel} |`,
          `| Blind Recall | ${v2Raw.aggregate.recallLabel} |`,
          `| False Agreement | ${v2Agg.falseAgreement} |`,
          `| False Divide | ${v2Agg.falseDivide} |`,
          `| False Complementary | ${v2Agg.falseComplementary} |`,
          `| Exit | ${v2Raw.exitStatus} |`,
          '',
          '### Per-fixture attribution',
          '',
          '| Fixture | Gold | Failure stage | Quality | Stability |',
          '|---------|------|---------------|---------|-----------|',
          ...v2Raw.fixtures.map(
            (f) =>
              `| ${f.fixtureId} | ${f.goldRelationshipCount} | ${f.failureAttribution} | ${f.relationshipQuality} | ${f.stability.pass ? 'PASS' : 'FAIL'} |`,
          ),
        ].join('\n')
      : '_V2 blind raw not found — run `npm run eval:reasoning:blind:v2` first._',
    '',
    '## Failure stage definitions',
    '',
    'EXTRACTION_FAILURE → RELEVANCE_FAILURE → CANDIDATE_FAILURE → VERIFICATION_FAILURE → CLASSIFICATION_FAILURE',
    '',
  ].join('\n')

  writeFileSync(join(root, 'reports/reasoning-v2-failure-matrix.md'), failureMatrix, 'utf8')

  const regression = [
    '# Reasoning V2 Regression Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Precision guard (Phase B)',
    '',
    baseline?.phaseB
      ? Object.entries(baseline.phaseB)
          .map(
            ([id, p]) =>
              `- ${id}: falseAgreement=${p.falseAgreement} falseDivide=${p.falseDivide} falseComplementary=${p.falseComplementary} pass=${p.pass}`,
          )
          .join('\n')
      : '_No Phase B baseline._',
    '',
    '## V1 → V2 metric delta',
    '',
    '| Metric | V1 | V2 |',
    '|--------|----|----|',
    `| Precision | ${pct(v1Agg?.precision)} | ${v2Agg ? v2Raw.aggregate.precisionLabel : 'pending'} |`,
    `| Recall | ${pct(v1Agg?.recall)} | ${v2Agg ? v2Raw.aggregate.recallLabel : 'pending'} |`,
    `| False Agreement | ${v1Agg?.falseAgreement ?? baseline?.blindTest?.falseAgreement} | ${v2Agg?.falseAgreement ?? 'pending'} |`,
    '',
    '## Unit / regression tests',
    '',
    '- proposition-semantics-recall',
    '- mcp-comparable-pool-regression',
    '- mcp-relevance-regression',
    '- heuristic-candidate-blind',
    '- pre-llm-coral / pre-llm-carbon',
    '',
  ].join('\n')

  writeFileSync(join(root, 'reports/reasoning-v2-regression-report.md'), regression, 'utf8')

  const productAcceptance = [
    '# Reasoning V2 Product Acceptance',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Status: NOT EXECUTED',
    '',
    'Automated product acceptance on live YouTube sets (A–E) was not run in this engineering cycle.',
    '',
    '### Reason',
    '',
    '- No curated YouTube URL sets or authenticated fetch pipeline were invoked from this eval harness.',
    '- Blind/benchmark fixtures use structured `SourceAnalysis` inputs, not live transcript ingestion.',
    '',
    '### Required to run acceptance',
    '',
    '1. YouTube video URLs or IDs for sets A–E (agreement, divide, complementary, mixed irrelevant, complex technical).',
    '2. Working YouTube transcript / analysis API credentials in the runtime environment.',
    '3. Product synthesis route (`runReasoningPipeline` with live `SourceAnalysis` from ingest).',
    '',
    '### Evaluation questions (when run)',
    '',
    '1. Is elcanto synthesis more useful than watching each source separately?',
    '2. Can users trace conclusions to source / claim / evidence?',
    '',
  ].join('\n')

  writeFileSync(join(root, 'reports/reasoning-v2-product-acceptance.md'), productAcceptance, 'utf8')

  const finalReport = [
    '# Reasoning V2 Final Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Executive summary',
    '',
    'Reasoning V2 (`reasoning-v2.2`) implements pipeline reliability recovery: claim-level relevance, extraction recovery, expanded participating sources for comparable/generation pools, semantic candidate bypass for low-overlap opposition/complement/agreement, PRE_LLM complementary mechanism-outcome allowance, and TRADE_OFF→CONTRADICTION normalization for opposing coal/null-effect pairs.',
    '',
    'V1 remains frozen at `reasoning-v2.1` / commit `70ea277`. V1 benchmark artifacts are preserved separately.',
    '',
    '## Architecture changes (V1 → V2)',
    '',
    '1. **Engine version**: `reasoning-v2.2` (`lib/reasoning/v2/engine-config.ts`)',
    '2. **Extraction recovery**: reinject structured claims when high-signal filter returns 0 (`lib/reasoning/v2/extraction-recovery.ts`)',
    '3. **Claim-level relevance**: score all claims, not only synthesis sources (`lib/reasoning/v2/relationship-eligibility.ts`)',
    '4. **Participating source union**: synthesis + claim-eligible sources drive comparable/generation pools',
    '5. **Candidate discovery**: semantic predicate compatibility and opposition bypass lexical overlap gate',
    '6. **Verification**: complementary mechanism/outcome bypass DIFFERENT_DIMENSION PRE_LLM; opposing TRADE_OFF normalized to CONTRADICTION',
    '',
    '## Benchmark results',
    '',
    '| Metric | V1 frozen | V2 |',
    '|--------|-----------|-----|',
    `| Blind Precision | ${pct(baseline?.blindTest?.precision)} | ${v2Agg ? v2Raw.aggregate.precisionLabel : '_pending blind run_'} |`,
    `| Blind Recall | ${pct(baseline?.blindTest?.recall)} | ${v2Agg ? v2Raw.aggregate.recallLabel : '_pending blind run_'} |`,
    `| False Agreement | 0 | ${v2Agg?.falseAgreement ?? '_pending_'} |`,
    `| False Divide | 0 | ${v2Agg?.falseDivide ?? '_pending_'} |`,
    `| False Complementary | 0 | ${v2Agg?.falseComplementary ?? '_pending_'} |`,
    '',
    '## Targeted fixture recovery (1-run spot checks)',
    '',
    'After V2 iteration 2: screen-sleep, fasting-weight, wildfire, coral, telehealth PASS; carbon agreement still intermittent; ocean/EV verification sensitive to LLM nondeterminism.',
    '',
    '## Production recommendation',
    '',
    v2Agg && v2Agg.recall >= 0.8 && v2Agg.falseAgreement === 0 && v2Agg.falseDivide === 0 && v2Agg.falseComplementary === 0
      ? '**Production candidate** — meets recall/precision guard targets on blind run.'
      : '**Engineering stop / targeted V3 backlog** — recall or stability targets not met; do not chase fixtures with threshold lowering. Continue with extraction multi-claim preservation for complex fixtures and blind 3-run stability validation.',
    '',
    '## Remaining failures (V3 backlog)',
    '',
    '- mixed-water-filtration relevance (claim-level partial source relevance)',
    '- carbon-pricing multi-claim generation pool (agreement + divide same fixture)',
    '- blind stability on ocean-ph / ev-range under LLM nondeterminism',
    '- MCP 5-run claim count reproducibility',
    '- Live YouTube product acceptance',
    '',
    '## Changed files (production)',
    '',
    '- `lib/reasoning/pipeline.ts`',
    '- `lib/reasoning/v2/*`',
    '- `lib/reasoning/comparable-claim-pool.ts`',
    '- `lib/reasoning/candidate-discovery.ts`',
    '- `lib/reasoning/proposition-semantics.ts`',
    '- `lib/reasoning/verification-alignment.ts`',
    '- `lib/reasoning/llm-steps.ts`',
    '',
  ].join('\n')

  writeFileSync(join(root, 'reports/reasoning-v2-final-report.md'), finalReport, 'utf8')

  const blindTestPath = join(root, 'reports/reasoning-v2-blind-test.md')
  const blindSection = existsSync(blindTestPath)
    ? readFileSync(blindTestPath, 'utf8')
    : '_Blind test markdown not found._'

  const consolidated = [
    '# elcanto Reasoning V2 — 통합 산출물',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Raw JSON: `reports/reasoning-v2-final-raw.json`',
    '',
    '---',
    '',
    readFileSync(join(root, 'reports/reasoning-v2-final-report.md'), 'utf8').replace(/^# .+\n\n/, '## Final Engineering Report\n\n'),
    '',
    '---',
    '',
    failureMatrix.replace(/^# .+\n\n/, '## Failure Matrix\n\n'),
    '',
    '---',
    '',
    regression.replace(/^# .+\n\n/, '## Regression Report\n\n'),
    '',
    '---',
    '',
    '## Blind Test Detail',
    '',
    blindSection.replace(/^# .+\n\n/, ''),
    '',
    '---',
    '',
    readFileSync(join(root, 'reports/reasoning-v2-product-acceptance.md'), 'utf8').replace(/^# .+\n\n/, '## Product Acceptance\n\n'),
  ].join('\n')

  writeFileSync(join(root, 'reports/reasoning-v2-consolidated.md'), consolidated, 'utf8')

  console.log('Wrote reports/reasoning-v2-failure-matrix.md')
  console.log('Wrote reports/reasoning-v2-regression-report.md')
  console.log('Wrote reports/reasoning-v2-product-acceptance.md')
  console.log('Wrote reports/reasoning-v2-final-report.md')
  console.log('Wrote reports/reasoning-v2-consolidated.md')
}

main()
