import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateReasoningEvalReport } from '@/lib/reasoning/eval/generate-report'
import { evaluateE2eReasoningQuality } from '@/lib/reasoning/eval/evaluate-e2e-quality'
import { refreshClaimExtractionForEval } from '@/lib/reasoning/eval/refresh-claim-extraction'
import {
  loadBaselineFixture,
  loadFixtureSources,
  loadSourceUrlsFromSynthesisJob,
} from '@/lib/reasoning/eval/fixtures'
import { isBenchmarkFixture } from '@/lib/reasoning/eval/benchmark-registry'
import { assertLiveEvalEnvironment } from '@/lib/reasoning/eval/load-project-env'
import {
  runUnitRegressionSuite,
  unitRegressionPassed,
} from '@/lib/reasoning/eval/regression-suite'
import {
  REPORT_DIR,
  REPORT_MD_PATH,
  REPORT_RAW_PATH,
  type E2eEvalResult,
  type ReasoningEvalSnapshot,
} from '@/lib/reasoning/eval/types'
import { runDeterministicReasoningTrace } from '@/lib/reasoning/eval/deterministic-trace'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'

function resolveGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'N/A'
  }
}

export type ReasoningEvalRunResult = {
  snapshot: ReasoningEvalSnapshot
  reportPath: string
  rawPath: string
  unitRegressionPassed: boolean
  e2ePassed: boolean
}

export type ReasoningEvalMode = 'live' | 'deterministic_test'

/**
 * Live reasoning evaluation — production pipeline + report.
 * Aborts immediately if OPENAI_API_KEY is missing (no silent fallback).
 */
export async function runReasoningEval(options?: {
  fixtureId?: string
  skipRegression?: boolean
  mode?: ReasoningEvalMode
  writePerFixtureReport?: boolean
}): Promise<ReasoningEvalRunResult> {
  const mode = options?.mode ?? 'live'
  const writePerFixtureReport = options?.writePerFixtureReport ?? true
  const fixture = loadBaselineFixture(options?.fixtureId)

  if (mode === 'live') {
    assertLiveEvalEnvironment()
  }

  const sourcesFromFixture = loadFixtureSources(fixture)
  let sources = sourcesFromFixture
  let extractionCoverage: ReasoningEvalSnapshot['extractionCoverage']
  let refreshedSources: ReasoningEvalSnapshot['refreshedSources']

  const isBenchmark = fixture.kind === 'benchmark' || isBenchmarkFixture(fixture.id)

  if (mode === 'live' && fixture.refreshClaimExtraction && !isBenchmark) {
    const refreshed = await refreshClaimExtractionForEval(sourcesFromFixture, {
      sourceIds: fixture.refreshClaimExtractionSourceIds,
    })
    sources = refreshed.analyses
    extractionCoverage = refreshed.extractionCoverage
    refreshedSources = refreshed.analyses
  }
  const urlBySource = fixture.synthesisJobId
    ? loadSourceUrlsFromSynthesisJob(fixture.synthesisJobId)
    : new Map<string, string>()

  if (sources.length < 2) {
    throw new Error(`Fixture ${fixture.id} has fewer than 2 sources`)
  }

  const sourceMeta = sources.map((s) => ({
    sourceId: s.sourceId,
    videoId: s.videoId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    url: urlBySource.get(s.sourceId),
  }))

  let reasoning: ReasoningEvalSnapshot['reasoning'] = null
  let pipelineError: string | undefined
  let e2eEvaluation: E2eEvalResult

  if (mode === 'deterministic_test') {
    reasoning = runDeterministicReasoningTrace({
      sources,
      question: fixture.question,
    })
    e2eEvaluation = {
      fixtureId: fixture.id,
      result: 'INVALID',
      reason: 'Deterministic test mode — live E2E not run',
    }
  } else {
    try {
      reasoning = await runReasoningPipeline({
        sources,
        voices: sources.map((s) => ({ channel: s.channel ?? 'Unknown' })),
        userQuestion: fixture.question,
        outputLanguage: fixture.outputLanguage,
      })
      e2eEvaluation = evaluateE2eReasoningQuality({
        fixtureId: fixture.id,
        reasoning,
        infrastructurePassed: true,
      })
    } catch (err) {
      pipelineError = err instanceof Error ? err.message : String(err)
      e2eEvaluation = {
        fixtureId: fixture.id,
        result: 'FAIL',
        infrastructureResult: 'FAIL',
        reasoningQualityResult: 'NOT_EVALUATED',
        reason: pipelineError,
      }
    }
  }

  const unitRegression = options?.skipRegression ? [] : runUnitRegressionSuite()
  const pipelineMode = mode === 'live' ? 'LIVE' : 'DETERMINISTIC_TEST'
  const e2eQualityValid =
    pipelineMode === 'LIVE' &&
    e2eEvaluation.result === 'PASS' &&
    e2eEvaluation.reasoningQualityResult === 'PASS'

  const snapshot: ReasoningEvalSnapshot = {
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: reasoning?.version ?? 'N/A',
      schemaVersion: reasoning?.schemaVersion ?? null,
      fixtureId: fixture.id,
      question: fixture.question,
      inputSourceCount: sources.length,
      commit: resolveGitCommit(),
      pipelineMode,
      pipelineError,
      e2eQualityValid,
    },
    sources: sourceMeta,
    reasoning,
    unitRegression,
    e2eEvaluation,
    extractionCoverage,
    refreshedSources,
  }

  const reportDir = join(process.cwd(), REPORT_DIR)
  mkdirSync(reportDir, { recursive: true })

  const rawPath = join(process.cwd(), REPORT_RAW_PATH)
  const mdPath = join(process.cwd(), REPORT_MD_PATH)
  const prevBackup = join(reportDir, 'reasoning-eval-raw.previous.json')

  if (writePerFixtureReport) {
    if (existsSync(rawPath)) {
      copyFileSync(rawPath, prevBackup)
    }

    const previousForDelta = existsSync(prevBackup) ? prevBackup : undefined
    const markdown = generateReasoningEvalReport(snapshot, previousForDelta)

    writeFileSync(rawPath, JSON.stringify(snapshot, null, 2), 'utf8')
    writeFileSync(mdPath, markdown, 'utf8')
  }

  return {
    snapshot,
    reportPath: mdPath,
    rawPath,
    unitRegressionPassed: unitRegressionPassed(unitRegression),
    e2ePassed: e2eEvaluation.result === 'PASS',
  }
}

export function assertEvalArtifactsExist(): void {
  const mdPath = join(process.cwd(), REPORT_MD_PATH)
  const rawPath = join(process.cwd(), REPORT_RAW_PATH)
  if (!existsSync(mdPath) || !existsSync(rawPath)) {
    throw new Error('Eval report files were not created')
  }
  const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as ReasoningEvalSnapshot
  if (!raw.meta?.generatedAt) {
    throw new Error('Raw eval JSON is missing metadata')
  }
}
