import { describe, expect, it } from 'vitest'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { runBlindTest } from '@/lib/reasoning/eval/run-blind-test'

loadProjectEnv()

describe('reasoning blind test runner', () => {
  it(
    'runs blind fixtures with stability, MCP repro, and graduation regression',
    async () => {
      const result = await runBlindTest()
      expect(result.rawPath).toContain('reasoning-v1-blind-test-raw.json')
      expect(result.reportPath).toContain('reasoning-v1-blind-test.md')
      expect(result.snapshot.fixtures.length).toBe(12)
      expect(result.snapshot.engine).toBe('reasoning-v2.1')
      console.log(
        `Blind exit=${result.snapshot.exitStatus} precision=${result.snapshot.aggregate.precisionLabel} recall=${result.snapshot.aggregate.recallLabel} graduation=${result.snapshot.baselineRegression.graduationSuitePass}`,
      )
    },
    7200000,
  )
})
