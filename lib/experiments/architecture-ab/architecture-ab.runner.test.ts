import { describe, it, expect } from 'vitest'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { runArchitectureAbExperiment } from '@/lib/experiments/architecture-ab/run-experiment'
import { writeArchitectureAbReports } from '@/lib/experiments/architecture-ab/write-reports'

const HAS_KEY = isLiveEvalEnvironmentReady()

describe.runIf(HAS_KEY)('architecture A/B experiment', () => {
  it(
    'runs full A/B harness and writes reports',
    async () => {
      const summary = await runArchitectureAbExperiment()
      await writeArchitectureAbReports(summary)

      expect(summary.cases.length).toBeGreaterThanOrEqual(6)
      expect(summary.decision.decision).toMatch(/KEEP_V2|SIMPLIFY|HYBRID/)
      expect(summary.aggregate.aWins + summary.aggregate.bWins + summary.aggregate.ties).toBe(
        summary.cases.length,
      )
    },
    900000,
  )
})

describe.skipIf(HAS_KEY)('architecture A/B experiment', () => {
  it('skipped — OPENAI_API_KEY required for live A/B run', () => {
    expect(true).toBe(true)
  })
})
