import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  analyzeStability,
  assessPipelineHealth,
  assessRelationshipQuality,
  attributeFailure,
  type FailureAttribution,
  type PipelineHealthResult,
  type RelationshipQualityResult,
  type StabilityAnalysis,
} from '@/lib/reasoning/eval/blind-assessment'
import {
  computeBlindPrecisionRecall,
  extractPipelineFunnel,
  relationshipIdentitySet,
  type BlindPrecisionRecall,
  type PipelineFunnelSnapshot,
} from '@/lib/reasoning/eval/blind-precision-recall'
import {
  BLIND_FIXTURE_ORDER,
  loadBlindFixtureMeta,
  loadBlindFixtureSources,
  type BlindFixtureId,
} from '@/lib/reasoning/eval/blind-registry'
import { loadBlindGold } from '@/lib/reasoning/eval/load-blind-gold'
import {
  collectBenchmarkMetrics,
  evaluateBenchmarkFixture,
} from '@/lib/reasoning/eval/evaluate-benchmark'
import { assertLiveEvalEnvironment } from '@/lib/reasoning/eval/load-project-env'
import { captureMcpReproducibilitySnapshot } from '@/lib/reasoning/eval/reproducibility'
import { runReasoningEval } from '@/lib/reasoning/eval/run-eval'
import { runReasoningSuite } from '@/lib/reasoning/eval/run-suite'
import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export const BLIND_REPORT_MD_PATH = 'reports/reasoning-v1-blind-test.md'
export const BLIND_REPORT_RAW_PATH = 'reports/reasoning-v1-blind-test-raw.json'
export const BLIND_BASELINE_FREEZE_PATH = 'tests/reasoning/blind/baseline-freeze.json'

const STABILITY_RUNS = Math.max(
  1,
  Number.parseInt(process.env.BLIND_STABILITY_RUNS ?? '3', 10) || 3,
)
const MCP_REPRO_RUNS = 5
const BASELINE_COMMIT = '70ea277ee9e98b45c1863600942a3f279c7cca3b'

function resolveGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'N/A'
  }
}

export type BlindFixtureRun = {
  runIndex: number
  generatedAt: string
  pipelineError?: string
  reasoning: MultiSourceReasoning | null
  metrics: ReturnType<typeof collectBenchmarkMetrics>
  funnel: PipelineFunnelSnapshot
  precisionRecall: BlindPrecisionRecall
  relationshipIds: string[]
}

export type BlindFixtureResult = {
  fixtureId: BlindFixtureId
  category: string
  question: string
  goldRelationshipCount: number
  runs: BlindFixtureRun[]
  stability: StabilityAnalysis
  evidenceIntegrity: 'PASS' | 'FAIL'
  relationshipQuality: RelationshipQualityResult
  pipelineHealth: PipelineHealthResult
  failureAttribution: FailureAttribution
  failureDetail: string
  evalBlockers: string[]
}

export type BlindTestSnapshot = {
  generatedAt: string
  engine: string
  commit: string
  baselineCommit: string
  baselineRegression: {
    graduationSuitePass: boolean
    suiteV1ExitStatus: string
    commitMatch: boolean
  }
  fixtures: BlindFixtureResult[]
  aggregate: {
    totalGoldRelationships: number
    totalPredictedRelationships: number
    truePositive: number
    falsePositive: number
    falseNegative: number
    precision: number | null
    recall: number | null
    precisionLabel: string
    recallLabel: string
    falseAgreement: number
    falseDivide: number
    falseComplementary: number
    unsupportedJudgment: number
    falseRelationshipsInJudgment: number
  }
  stabilitySummary: {
    relationshipStabilityPass: boolean
    pipelineStabilityPass: boolean
    claimPopulationDrift: number
    relevanceCollapse: number
    candidateCollapse: number
    relationshipDrift: number
    judgmentDrift: number
  }
  mcpReproducibility: {
    runs: ReturnType<typeof captureMcpReproducibilitySnapshot>[]
    diagnosis: string[]
  }
  exitStatus: 'READY FOR PRODUCTION HARDENING' | 'NEEDS TARGETED FIX' | 'REASONING V1 NOT STABLE'
  failureAttributions: Array<{
    fixtureId: string
    stage: FailureAttribution
    detail: string
    frequency: string
  }>
  remediationCandidates: Array<{
    stage: FailureAttribution
    hypothesis: string
    regressionRisk: string
  }>
}

async function runBlindFixtureLive(
  fixtureId: BlindFixtureId,
  runIndex: number,
): Promise<BlindFixtureRun> {
  const meta = loadBlindFixtureMeta(fixtureId)
  const sources = loadBlindFixtureSources(fixtureId)
  const gold = loadBlindGold(fixtureId)

  let reasoning: MultiSourceReasoning | null = null
  let pipelineError: string | undefined

  try {
    reasoning = await runReasoningPipeline({
      sources,
      voices: sources.map((s) => ({ channel: s.channel ?? 'Unknown' })),
      userQuestion: meta.question,
      outputLanguage: meta.outputLanguage ?? 'en',
    })
  } catch (err) {
    pipelineError = err instanceof Error ? err.message : String(err)
  }

  const metrics = collectBenchmarkMetrics(reasoning)
  const funnel = extractPipelineFunnel(metrics)
  const verified = reasoning?.relationships ?? []
  const claims = reasoning?.claims ?? []
  const precisionRecall = computeBlindPrecisionRecall(verified, claims, gold, metrics)

  return {
    runIndex,
    generatedAt: new Date().toISOString(),
    pipelineError,
    reasoning,
    metrics,
    funnel,
    precisionRecall,
    relationshipIds: relationshipIdentitySet(verified),
  }
}

export async function runBlindTest(options?: {
  fixtureFilter?: BlindFixtureId[]
  skipGraduationRegression?: boolean
  skipMcpRepro?: boolean
  reportMdPath?: string
  reportRawPath?: string
  recallTarget?: number
  engineLabel?: string
  exitStatusV2?: boolean
}): Promise<{ snapshot: BlindTestSnapshot; reportPath: string; rawPath: string }> {
  assertLiveEvalEnvironment()

  const recallTarget = options?.recallTarget ?? 0.9
  const engineLabel = options?.engineLabel ?? 'reasoning-v2.1'
  const fixtureIds = options?.fixtureFilter ?? [...BLIND_FIXTURE_ORDER]
  const fixtures: BlindFixtureResult[] = []

  for (const fixtureId of fixtureIds) {
    const meta = loadBlindFixtureMeta(fixtureId)
    const gold = loadBlindGold(fixtureId)
    const runs: BlindFixtureRun[] = []

    for (let i = 1; i <= STABILITY_RUNS; i++) {
      runs.push(await runBlindFixtureLive(fixtureId, i))
    }

    const lastRun = runs[runs.length - 1]
    const evalResult = evaluateBenchmarkFixture({
      fixtureId,
      gold,
      reasoning: lastRun.reasoning,
      infrastructurePassed: !lastRun.pipelineError,
      pipelineError: lastRun.pipelineError,
    })

    const stabilityRuns = runs.map((r) => ({
      runIndex: r.runIndex,
      funnel: r.funnel,
      relationshipIds: r.relationshipIds,
      verified: r.reasoning?.relationships ?? [],
      claims: r.reasoning?.claims ?? [],
    }))
    const stability = analyzeStability(stabilityRuns, gold)

    const pipelineHealth = assessPipelineHealth(lastRun.funnel, lastRun.metrics, gold)
    const relationshipQuality = assessRelationshipQuality(lastRun.precisionRecall, gold)
    const attribution = attributeFailure(
      lastRun.reasoning,
      gold,
      lastRun.metrics,
      lastRun.funnel,
    )

    fixtures.push({
      fixtureId,
      category: meta.category,
      question: meta.question,
      goldRelationshipCount: gold.expectedRelationships.filter((e) => e.required).length,
      runs,
      stability,
      evidenceIntegrity: lastRun.metrics.evidenceIntegrityPass ? 'PASS' : 'FAIL',
      relationshipQuality,
      pipelineHealth,
      failureAttribution: attribution.stage,
      failureDetail: attribution.detail,
      evalBlockers: evalResult.blockers,
    })
  }

  let tp = 0
  let fp = 0
  let fn = 0
  let falseAgreement = 0
  let falseDivide = 0
  let falseComplementary = 0
  let unsupported = 0
  let falseInJudgment = 0
  let totalGold = 0
  let totalPredicted = 0

  for (const f of fixtures) {
    const last = f.runs[f.runs.length - 1]
    tp += last.precisionRecall.truePositive
    fp += last.precisionRecall.falsePositive
    fn += last.precisionRecall.falseNegative
    falseAgreement += last.metrics.falseAgreement
    falseDivide += last.metrics.falseDivide
    falseComplementary += last.metrics.falseComplementary
    unsupported += last.metrics.unsupportedPropositions
    falseInJudgment += last.metrics.falseRelationshipsInJudgment
    totalGold += last.precisionRecall.goldRelationships
    totalPredicted += last.precisionRecall.predictedRelationships
  }

  const precDenom = tp + fp
  const recDenom = tp + fn
  const aggregatePrecision = precDenom > 0 ? tp / precDenom : null
  const aggregateRecall = recDenom > 0 ? tp / recDenom : null

  const stabilitySummary = {
    relationshipStabilityPass: fixtures.every((f) => {
      if (f.goldRelationshipCount === 0) return true
      const acceptable = f.stability.goldRelationshipStability.filter(
        (g) => g.consistency === 'STABLE' || g.consistency === 'UNSTABLE',
      ).length
      return acceptable / f.goldRelationshipCount >= 0.9
    }),
    pipelineStabilityPass: fixtures.every(
      (f) => !f.stability.flags.includes('RELEVANCE_COLLAPSE') && !f.stability.flags.includes('CANDIDATE_COLLAPSE'),
    ),
    claimPopulationDrift: fixtures.filter((f) => f.stability.flags.includes('CLAIM_POPULATION_DRIFT')).length,
    relevanceCollapse: fixtures.filter((f) => f.stability.flags.includes('RELEVANCE_COLLAPSE')).length,
    candidateCollapse: fixtures.filter((f) => f.stability.flags.includes('CANDIDATE_COLLAPSE')).length,
    relationshipDrift: fixtures.filter((f) => f.stability.flags.includes('RELATIONSHIP_DRIFT')).length,
    judgmentDrift: fixtures.filter((f) => f.stability.flags.includes('JUDGMENT_DRIFT')).length,
  }

  const mcpRuns: ReturnType<typeof captureMcpReproducibilitySnapshot>[] = []
  const mcpDiagnosis: string[] = []

  if (!options?.skipMcpRepro) {
    for (let i = 1; i <= MCP_REPRO_RUNS; i++) {
      const evalResult = await runReasoningEval({
        fixtureId: 'mcp-3video-baseline',
        skipRegression: true,
        writePerFixtureReport: false,
      })
      mcpRuns.push(captureMcpReproducibilitySnapshot(`mcp-run-${i}`, evalResult.snapshot))
    }

    const claimRange = mcpRuns.map((r) => r.claims)
    const genRange = mcpRuns.map((r) => r.generationEligible)
    const candRange = mcpRuns.map((r) => r.candidates)
    mcpDiagnosis.push(
      `claims range: ${Math.min(...claimRange)}–${Math.max(...claimRange)} (LLM extraction nondeterminism candidate)`,
    )
    mcpDiagnosis.push(
      `generationEligible range: ${Math.min(...genRange)}–${Math.max(...genRange)} (relevance/eligibility nondeterminism candidate)`,
    )
    mcpDiagnosis.push(
      `candidates range: ${Math.min(...candRange)}–${Math.max(...candRange)} (candidate discovery instability candidate)`,
    )
    if (Math.max(...claimRange) - Math.min(...claimRange) > 5) {
      mcpDiagnosis.push('Large claim count swing suggests LLM extraction nondeterminism or parsing variability.')
    }
    if (Math.min(...genRange) === 0 && Math.max(...genRange) > 0) {
      mcpDiagnosis.push('generationEligible=0 in some runs suggests relevance scoring nondeterminism or threshold edge cases.')
    }
    mcpDiagnosis.push('Fixture loading uses same synthesis job — fixture loading discrepancy unlikely unless refresh flags differ.')
    mcpDiagnosis.push('Model/temperature/seed: OPENAI_MODEL and OPENAI_TEMPERATURE env defaults apply; no seed set.')
  }

  let graduationSuitePass = false
  let suiteV1ExitStatus = 'NOT RUN'
  const currentCommit = resolveGitCommit()

  if (!options?.skipGraduationRegression) {
    const suite = await runReasoningSuite()
    graduationSuitePass =
      suite.snapshot.v1ExitStatus === 'READY FOR BLIND TEST' &&
      suite.snapshot.suiteBlockers.length === 0
    suiteV1ExitStatus = suite.snapshot.v1ExitStatus
  }

  const precisionPass = aggregatePrecision === null ? true : aggregatePrecision >= 0.95
  const recallPass = aggregateRecall === null ? true : aggregateRecall >= recallTarget
  const falseRelPass = falseAgreement === 0 && falseDivide === 0 && falseComplementary === 0
  const judgmentPass = unsupported === 0 && falseInJudgment === 0
  const stabilityPass =
    stabilitySummary.relationshipStabilityPass && stabilitySummary.pipelineStabilityPass

  let exitStatus: BlindTestSnapshot['exitStatus']
  if (options?.exitStatusV2) {
    if (precisionPass && recallPass && falseRelPass && judgmentPass && stabilityPass && graduationSuitePass) {
      exitStatus = 'READY FOR PRODUCTION HARDENING'
    } else if (precisionPass && falseRelPass && !recallPass) {
      exitStatus = 'NEEDS TARGETED FIX'
    } else {
      exitStatus = 'REASONING V1 NOT STABLE'
    }
  } else if (precisionPass && recallPass && falseRelPass && judgmentPass && stabilityPass && graduationSuitePass) {
    exitStatus = 'READY FOR PRODUCTION HARDENING'
  } else if (!stabilityPass || !precisionPass || !recallPass) {
    exitStatus = 'REASONING V1 NOT STABLE'
  } else {
    exitStatus = 'NEEDS TARGETED FIX'
  }

  const failureAttributions = fixtures
    .filter((f) => f.failureAttribution !== 'NONE')
    .map((f) => ({
      fixtureId: f.fixtureId,
      stage: f.failureAttribution,
      detail: f.failureDetail,
      frequency: `${f.runs.filter((r) => r.precisionRecall.falseNegative > 0 || r.precisionRecall.falsePositive > 0).length}/${STABILITY_RUNS} runs affected`,
    }))

  const remediationCandidates = buildRemediationCandidates(fixtures)

  const fullSnapshot: BlindTestSnapshot = {
    generatedAt: new Date().toISOString(),
    engine: engineLabel,
    commit: currentCommit,
    baselineCommit: BASELINE_COMMIT,
    baselineRegression: {
      graduationSuitePass,
      suiteV1ExitStatus,
      commitMatch: currentCommit.startsWith(BASELINE_COMMIT.slice(0, 8)),
    },
    fixtures,
    aggregate: {
      totalGoldRelationships: totalGold,
      totalPredictedRelationships: totalPredicted,
      truePositive: tp,
      falsePositive: fp,
      falseNegative: fn,
      precision: aggregatePrecision,
      recall: aggregateRecall,
      precisionLabel:
        aggregatePrecision !== null ? `${aggregatePrecision}` : 'N/A — no predicted relationships',
      recallLabel:
        aggregateRecall !== null ? `${aggregateRecall}` : 'N/A — no gold relationships',
      falseAgreement,
      falseDivide,
      falseComplementary,
      unsupportedJudgment: unsupported,
      falseRelationshipsInJudgment: falseInJudgment,
    },
    stabilitySummary,
    mcpReproducibility: { runs: mcpRuns, diagnosis: mcpDiagnosis },
    exitStatus,
    failureAttributions,
    remediationCandidates,
  }

  const reportDir = join(process.cwd(), 'reports')
  mkdirSync(reportDir, { recursive: true })
  const rawPath = join(process.cwd(), options?.reportRawPath ?? BLIND_REPORT_RAW_PATH)
  const reportPath = join(process.cwd(), options?.reportMdPath ?? BLIND_REPORT_MD_PATH)

  writeFileSync(rawPath, JSON.stringify(fullSnapshot, null, 2), 'utf8')
  const { generateBlindTestReport } = await import('@/lib/reasoning/eval/generate-blind-report')
  writeFileSync(reportPath, generateBlindTestReport(fullSnapshot), 'utf8')

  return { snapshot: fullSnapshot, reportPath, rawPath }
}

function buildRemediationCandidates(
  fixtures: BlindFixtureResult[],
): BlindTestSnapshot['remediationCandidates'] {
  const stages = new Set(fixtures.map((f) => f.failureAttribution).filter((s) => s !== 'NONE'))
  const candidates: BlindTestSnapshot['remediationCandidates'] = []

  if (stages.has('EXTRACTION_FAILURE')) {
    candidates.push({
      stage: 'EXTRACTION_FAILURE',
      hypothesis: 'LLM claim extraction drops or mis-segments claims on unseen phrasing.',
      regressionRisk: 'Changing extraction prompt may alter graduation fixture claim counts.',
    })
  }
  if (stages.has('RELEVANCE_FAILURE') || fixtures.some((f) => f.stability.flags.includes('RELEVANCE_COLLAPSE'))) {
    candidates.push({
      stage: 'RELEVANCE_FAILURE',
      hypothesis: 'Relevance scoring nondeterministic or threshold-sensitive on borderline sources.',
      regressionRisk: 'Threshold tuning may admit off-topic sources in mixed fixtures.',
    })
  }
  if (stages.has('CANDIDATE_DISCOVERY_FAILURE') || fixtures.some((f) => f.stability.flags.includes('CANDIDATE_COLLAPSE'))) {
    candidates.push({
      stage: 'CANDIDATE_DISCOVERY_FAILURE',
      hypothesis: 'Candidate pair generation unstable across runs with comparable claims present.',
      regressionRisk: 'Candidate recall changes affect clear-agreement graduation fixture.',
    })
  }
  if (stages.has('RELATIONSHIP_VERIFICATION_FAILURE') || stages.has('RELATIONSHIP_CLASSIFICATION_FAILURE')) {
    candidates.push({
      stage: 'RELATIONSHIP_VERIFICATION_FAILURE',
      hypothesis: 'Verifier or proposition gate rejects valid unseen paraphrases or misclassifies opposition.',
      regressionRisk: 'Verifier prompt changes affect clear-divide and mixed-irrelevant gates.',
    })
  }
  if (fixtures.some((f) => f.stability.flags.includes('RELATIONSHIP_DRIFT'))) {
    candidates.push({
      stage: 'STABILITY_FAILURE',
      hypothesis: 'LLM verifier returns different relationship types across identical inputs.',
      regressionRisk: 'Any verifier temperature or prompt change affects all relationship fixtures.',
    })
  }

  return candidates
}
