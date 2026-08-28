import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { generateReasoningSuiteReport } from '@/lib/reasoning/eval/generate-suite-report'
import { runReasoningEval } from '@/lib/reasoning/eval/run-eval'
import { finalizeSuiteReproducibility, runReasoningSuite } from '@/lib/reasoning/eval/run-suite'
import { SUITE_REPORT_MD_PATH, SUITE_REPORT_RAW_PATH } from '@/lib/reasoning/eval/types'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

loadProjectEnv()

describe('reasoning suite runner', () => {
  it(
    'runs reproducibility check + full benchmark suite and writes graduation report',
    async () => {
      const mcpBefore = await runReasoningEval({
        fixtureId: 'mcp-3video-baseline',
        skipRegression: true,
        writePerFixtureReport: true,
      })

      let result = await runReasoningSuite({
        standaloneBeforeEval: mcpBefore.snapshot,
      })

      const mcpAfter = await runReasoningEval({
        fixtureId: 'mcp-3video-baseline',
        skipRegression: true,
        writePerFixtureReport: true,
      })

      const finalizedSnapshot = finalizeSuiteReproducibility(result.snapshot, mcpAfter.snapshot)
      const mdPath = join(process.cwd(), SUITE_REPORT_MD_PATH)
      const rawPath = join(process.cwd(), SUITE_REPORT_RAW_PATH)
      writeFileSync(rawPath, JSON.stringify(finalizedSnapshot, null, 2), 'utf8')
      writeFileSync(mdPath, generateReasoningSuiteReport(finalizedSnapshot), 'utf8')
      result = { ...result, snapshot: finalizedSnapshot }

      expect(existsSync(mdPath)).toBe(true)
      expect(existsSync(rawPath)).toBe(true)
      expect(result.snapshot.results.length).toBe(5)

      console.log(
        `Suite v1Exit=${result.snapshot.v1ExitStatus} aggregatePrecision=${result.snapshot.aggregatePrecision} largestFailure=${result.snapshot.largestFailure ?? 'none'}`,
      )
      if (result.snapshot.reproducibility?.standaloneBeforeVsSuiteDiffs?.length) {
        console.log(
          `Reproducibility before vs suite diffs: ${result.snapshot.reproducibility.standaloneBeforeVsSuiteDiffs.join('; ')}`,
        )
      }
      if (result.snapshot.reproducibility?.standaloneBeforeVsAfterDiffs?.length) {
        console.log(
          `Reproducibility before vs after diffs: ${result.snapshot.reproducibility.standaloneBeforeVsAfterDiffs.join('; ')}`,
        )
      }
      for (const r of result.snapshot.results) {
        console.log(
          `  ${r.fixtureId}: ${r.result} precision=${r.metrics.precision} recall=${r.metrics.recall} blockers=${r.blockers.join(';')}`,
        )
      }
    },
    3600000,
  )
})
