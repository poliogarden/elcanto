import { describe, expect, it } from 'vitest'
import { REASONING_V2_ENGINE_VERSION } from '@/lib/reasoning/v2/engine-config'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { runBlindTest } from '@/lib/reasoning/eval/run-blind-test'

loadProjectEnv()

describe('reasoning v2 blind test runner', () => {
  it(
    'runs blind fixtures with V2 engine, 3-run stability, graduation regression, MCP repro',
    async () => {
      const result = await runBlindTest({
        reportMdPath: 'reports/reasoning-v2-blind-test.md',
        reportRawPath: 'reports/reasoning-v2-final-raw.json',
        recallTarget: 0.8,
        engineLabel: REASONING_V2_ENGINE_VERSION,
        exitStatusV2: true,
      })
      expect(result.rawPath).toContain('reasoning-v2-final-raw.json')
      expect(result.snapshot.fixtures.length).toBe(12)
      expect(result.snapshot.engine).toBe(REASONING_V2_ENGINE_VERSION)
      console.log(
        `V2 blind exit=${result.snapshot.exitStatus} precision=${result.snapshot.aggregate.precisionLabel} recall=${result.snapshot.aggregate.recallLabel} graduation=${result.snapshot.baselineRegression.graduationSuitePass}`,
      )
    },
    7200000,
  )
})
