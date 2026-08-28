import { describe, expect, it } from 'vitest'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import {
  assertEvalArtifactsExist,
  runReasoningEval,
} from '@/lib/reasoning/eval/run-eval'

loadProjectEnv()

describe('reasoning eval runner', () => {
  it(
    'runs live baseline fixture, collects diagnostics, and writes eval reports',
    async () => {
      const result = await runReasoningEval({
        fixtureId: process.env.REASONING_EVAL_FIXTURE ?? 'mcp-3video-baseline',
        mode: 'live',
      })
      assertEvalArtifactsExist()
      expect(result.reportPath).toContain('reasoning-eval-report.md')
      expect(result.rawPath).toContain('reasoning-eval-raw.json')
      expect(result.snapshot.meta.fixtureId).toBe(
        process.env.REASONING_EVAL_FIXTURE ?? 'mcp-3video-baseline',
      )
      expect(result.snapshot.meta.pipelineMode).toBe('LIVE')
      expect(result.snapshot.meta.pipelineMode).toBe('LIVE')
      expect(result.snapshot.reasoning).not.toBeNull()
      expect(result.snapshot.e2eEvaluation.infrastructureResult).toBe('PASS')
      if (!result.unitRegressionPassed) {
        const failed = result.snapshot.unitRegression.filter((r) => r.result === 'FAIL')
        throw new Error(
          `Unit regression failures: ${failed.map((f) => f.name).join(', ')}`,
        )
      }
      // Reasoning quality may be FAIL/DEGRADED until verified relationships exist.
      console.log(
        `E2E overall=${result.snapshot.e2eEvaluation.result} quality=${result.snapshot.e2eEvaluation.reasoningQualityResult} reason=${result.snapshot.e2eEvaluation.reason ?? ''}`,
      )
    },
    900000,
  )
})
