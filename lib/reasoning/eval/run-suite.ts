import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getBenchmarkGold, SUITE_FIXTURE_ORDER } from '@/lib/reasoning/eval/benchmark-gold'
import { isBenchmarkFixture } from '@/lib/reasoning/eval/benchmark-registry'
import {
  evaluateBenchmarkFixture,
  evaluateMcpRegressionGuard,
} from '@/lib/reasoning/eval/evaluate-benchmark'
import { buildGoldRecallTraces } from '@/lib/reasoning/eval/gold-recall-trace'
import {
  captureMcpReproducibilitySnapshot,
  compareReproducibilitySnapshots,
} from '@/lib/reasoning/eval/reproducibility'
import { generateReasoningSuiteReport } from '@/lib/reasoning/eval/generate-suite-report'
import { assertLiveEvalEnvironment } from '@/lib/reasoning/eval/load-project-env'
import {
  runUnitRegressionSuite,
  unitRegressionPassed,
} from '@/lib/reasoning/eval/regression-suite'
import { runReasoningEval } from '@/lib/reasoning/eval/run-eval'
import {
  REPORT_DIR,
  SUITE_REPORT_MD_PATH,
  SUITE_REPORT_RAW_PATH,
  type ReasoningEvalSnapshot,
  type ReasoningSuiteSnapshot,
} from '@/lib/reasoning/eval/types'

function resolveGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'N/A'
  }
}

const EMPTY_METRICS = {
  totalClaims: 0,
  totalExtractedClaims: 0,
  evidenceSupportedClaims: 0,
  relevanceUsable: 0,
  generationEligible: 0,
  candidates: 0,
  verified: 0,
  agreement: 0,
  divide: 0,
  complementary: 0,
  falseAgreement: 0,
  falseDivide: 0,
  falseComplementary: 0,
  missedExpectedRelationships: 0,
  evidenceIntegrityPass: false,
  aggregationInvariantFailures: [],
  supportedPropositions: 0,
  unsupportedPropositions: 0,
  judgmentConfidence: 'N/A',
  judgmentLineageStatus: 'N/A',
  reasoningQuality: 'NOT_EVALUATED',
  precision: 0,
  recall: 0,
  agreementPrecision: 1,
  dividePrecision: 1,
  complementaryPrecision: 1,
  falseRelationshipsInJudgment: 0,
  participatingSourceIds: [],
  excludedSourceIds: [],
} as const

export type ReasoningSuiteRunResult = {
  snapshot: ReasoningSuiteSnapshot
  reportPath: string
  rawPath: string
  unitRegressionPassed: boolean
}

export function finalizeSuiteReproducibility(
  snapshot: ReasoningSuiteSnapshot,
  standaloneAfterEval: ReasoningEvalSnapshot,
): ReasoningSuiteSnapshot {
  const standaloneAfter = captureMcpReproducibilitySnapshot(
    'standalone-after',
    standaloneAfterEval,
  )
  const standaloneBefore = snapshot.reproducibility?.standaloneBefore
  const suiteMcp = snapshot.reproducibility?.suiteMcp
  return {
    ...snapshot,
    reproducibility: {
      standaloneBefore,
      suiteMcp,
      standaloneAfter,
      standaloneBeforeVsSuiteDiffs:
        standaloneBefore && suiteMcp
          ? compareReproducibilitySnapshots(standaloneBefore, suiteMcp)
          : snapshot.reproducibility?.standaloneBeforeVsSuiteDiffs,
      standaloneBeforeVsAfterDiffs:
        standaloneBefore
          ? compareReproducibilitySnapshots(standaloneBefore, standaloneAfter)
          : undefined,
      suiteVsStandaloneAfterDiffs:
        suiteMcp ? compareReproducibilitySnapshots(suiteMcp, standaloneAfter) : undefined,
    },
  }
}

export async function runReasoningSuite(options?: {
  standaloneBeforeEval?: ReasoningEvalSnapshot
}): Promise<ReasoningSuiteRunResult> {
  assertLiveEvalEnvironment()

  const unitRegression = runUnitRegressionSuite()
  const results: ReasoningSuiteSnapshot['results'] = []
  let engineVersion = 'N/A'

  const benchmarkDir = join(process.cwd(), REPORT_DIR, 'benchmark')
  mkdirSync(benchmarkDir, { recursive: true })

  let suiteMcpEvalSnapshot: ReasoningEvalSnapshot | undefined

  for (const fixtureId of SUITE_FIXTURE_ORDER) {
    const gold = getBenchmarkGold(fixtureId)
    if (!gold) {
      results.push({
        fixtureId,
        label: fixtureId,
        result: 'FAIL',
        infrastructureResult: 'FAIL',
        failureReasons: ['MISSING_GOLD_EXPECTATIONS'],
        blockers: ['MISSING_GOLD_EXPECTATIONS'],
        v2Backlog: [],
        pipelineDiagnosis: [],
        metrics: { ...EMPTY_METRICS },
      })
      continue
    }

    const evalResult = await runReasoningEval({
      fixtureId,
      mode: 'live',
      skipRegression: true,
      writePerFixtureReport: false,
    })

    if (evalResult.snapshot.reasoning?.version) {
      engineVersion = evalResult.snapshot.reasoning.version
    }

    writeFileSync(
      join(benchmarkDir, `${fixtureId}-raw.json`),
      JSON.stringify(evalResult.snapshot, null, 2),
      'utf8',
    )

    const infrastructurePassed = evalResult.snapshot.e2eEvaluation.infrastructureResult === 'PASS'
    const pipelineError = evalResult.snapshot.meta.pipelineError

    let benchmarkResult = evaluateBenchmarkFixture({
      fixtureId,
      gold,
      reasoning: evalResult.snapshot.reasoning,
      infrastructurePassed,
      pipelineError,
      reasoningQualityResult: evalResult.snapshot.e2eEvaluation.reasoningQualityResult,
    })

    if (fixtureId === 'mcp-3video-baseline') {
      suiteMcpEvalSnapshot = evalResult.snapshot
    }

    let mcpRegression: { result: 'PASS' | 'FAIL'; failureReasons: string[] } | undefined
    if (fixtureId === 'mcp-3video-baseline') {
      mcpRegression = evaluateMcpRegressionGuard(evalResult.snapshot.reasoning)
      if (mcpRegression.result === 'FAIL') {
        benchmarkResult = {
          ...benchmarkResult,
          result: 'FAIL',
          failureReasons: [...benchmarkResult.failureReasons, ...mcpRegression.failureReasons],
          blockers: [...benchmarkResult.blockers, ...mcpRegression.failureReasons],
        }
      }
    }

    results.push({
      fixtureId: benchmarkResult.fixtureId,
      label: benchmarkResult.label,
      result: benchmarkResult.result,
      infrastructureResult: benchmarkResult.infrastructureResult,
      failureReasons: benchmarkResult.failureReasons,
      blockers: benchmarkResult.blockers,
      v2Backlog: benchmarkResult.v2Backlog,
      pipelineDiagnosis: benchmarkResult.pipelineDiagnosis,
      metrics: benchmarkResult.metrics,
      pipelineError: benchmarkResult.pipelineError,
      mcpRegression,
    })
  }

  const benchmarkOnly = results.filter((r) => r.fixtureId !== 'mcp-3video-baseline')
  const mcpResult = results.find((r) => r.fixtureId === 'mcp-3video-baseline')
  const precisions = results.map((r) => r.metrics.precision)
  const recalls = results.map((r) => r.metrics.recall)
  const aggregatePrecision =
    precisions.length > 0 ? precisions.reduce((a, b) => a + b, 0) / precisions.length : 0
  const aggregateRecall =
    recalls.length > 0 ? recalls.reduce((a, b) => a + b, 0) / recalls.length : 0

  const overallFalseAgreement = results.reduce((s, r) => s + r.metrics.falseAgreement, 0)
  const overallFalseDivide = results.reduce((s, r) => s + r.metrics.falseDivide, 0)
  const overallFalseComplementary = results.reduce((s, r) => s + r.metrics.falseComplementary, 0)
  const overallMissedGold = results.reduce((s, r) => s + r.metrics.missedExpectedRelationships, 0)
  const judgmentSupported = results.reduce((s, r) => s + r.metrics.supportedPropositions, 0)
  const judgmentUnsupported = results.reduce((s, r) => s + r.metrics.unsupportedPropositions, 0)
  const falseRelationshipsInJudgment = results.reduce(
    (s, r) => s + r.metrics.falseRelationshipsInJudgment,
    0,
  )

  const suiteBlockers: string[] = []
  const suiteV2Backlog: string[] = []
  for (const r of results) {
    for (const b of r.blockers) {
      suiteBlockers.push(`${r.fixtureId}: ${b}`)
    }
    for (const item of r.v2Backlog) {
      suiteV2Backlog.push(`${r.fixtureId}: ${item}`)
    }
  }

  const benchmarkPasses = benchmarkOnly.every((r) => r.result === 'PASS')
  const mcpPass = mcpResult?.result === 'PASS' && mcpResult.mcpRegression?.result === 'PASS'
  const mcpRegressionResult: 'PASS' | 'FAIL' = mcpPass ? 'PASS' : 'FAIL'
  const unitPass = unitRegressionPassed(unitRegression)
  const precisionPass = aggregatePrecision >= 0.9

  const v1ExitStatus =
    benchmarkPasses && mcpPass && unitPass && precisionPass && suiteBlockers.length === 0
      ? 'READY FOR BLIND TEST'
      : 'NOT READY'

  const failed = results.filter((r) => r.result === 'FAIL')
  const largestFailure =
    failed.length > 0
      ? failed
          .map((r) => `${r.label}: ${r.blockers[0] ?? r.failureReasons[0] ?? 'FAIL'}`)
          .join('; ')
      : undefined

  const sameTopic = results.find((r) => r.fixtureId === 'same-topic-different-claims')
  const precisionRegressionGuard = {
    sameTopicPass: sameTopic?.result === 'PASS',
    falseAgreement: overallFalseAgreement,
    falseDivide: overallFalseDivide,
    falseComplementary: overallFalseComplementary,
    result:
      sameTopic?.result === 'PASS' &&
      overallFalseAgreement === 0 &&
      overallFalseDivide === 0 &&
      overallFalseComplementary === 0
        ? 'PASS'
        : 'FAIL',
  } as const

  const reproducibility = (() => {
    const standaloneBefore = options?.standaloneBeforeEval
      ? captureMcpReproducibilitySnapshot('standalone-before', options.standaloneBeforeEval)
      : undefined
    const suiteMcp = suiteMcpEvalSnapshot
      ? captureMcpReproducibilitySnapshot('suite-mcp', suiteMcpEvalSnapshot)
      : undefined
    const standaloneAfter = undefined
    if (!standaloneBefore && !suiteMcp && !standaloneAfter) return undefined
    return {
      standaloneBefore,
      suiteMcp,
      standaloneAfter,
      standaloneBeforeVsSuiteDiffs:
        standaloneBefore && suiteMcp
          ? compareReproducibilitySnapshots(standaloneBefore, suiteMcp)
          : undefined,
      standaloneBeforeVsAfterDiffs: undefined,
      suiteVsStandaloneAfterDiffs: undefined,
    }
  })()

  const snapshot: ReasoningSuiteSnapshot = {
    generatedAt: new Date().toISOString(),
    commit: resolveGitCommit(),
    engineVersion,
    pipelineMode: 'LIVE',
    results,
    unitRegression,
    v1ExitStatus,
    aggregatePrecision: Math.round(aggregatePrecision * 1000) / 1000,
    aggregateRecall: Math.round(aggregateRecall * 1000) / 1000,
    suiteBlockers,
    suiteV2Backlog,
    overallFalseAgreement,
    overallFalseDivide,
    overallFalseComplementary,
    overallMissedGold,
    judgmentSupported,
    judgmentUnsupported,
    falseRelationshipsInJudgment,
    mcpRegressionResult,
    largestFailure,
    reproducibility,
    goldRecallTraces: buildGoldRecallTraces(),
    precisionRegressionGuard,
  }

  const reportDir = join(process.cwd(), REPORT_DIR)
  mkdirSync(reportDir, { recursive: true })
  const mdPath = join(process.cwd(), SUITE_REPORT_MD_PATH)
  const rawPath = join(process.cwd(), SUITE_REPORT_RAW_PATH)
  const markdown = generateReasoningSuiteReport(snapshot)

  writeFileSync(rawPath, JSON.stringify(snapshot, null, 2), 'utf8')
  writeFileSync(mdPath, markdown, 'utf8')

  return {
    snapshot,
    reportPath: mdPath,
    rawPath,
    unitRegressionPassed: unitPass,
  }
}

export function listAvailableFixtures(): string[] {
  return [...SUITE_FIXTURE_ORDER]
}

export function isSuiteBenchmarkFixture(fixtureId: string): boolean {
  return isBenchmarkFixture(fixtureId) || fixtureId === 'mcp-3video-baseline'
}
