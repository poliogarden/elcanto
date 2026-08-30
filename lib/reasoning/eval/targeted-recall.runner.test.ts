import { describe, expect, it } from 'vitest'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { runBlindTest } from '@/lib/reasoning/eval/run-blind-test'

loadProjectEnv()

const TARGETED_FIXTURES = [
  'blind-agreement-ocean-ph',
  'blind-agreement-ev-range',
  'blind-divide-screen-sleep',
  'blind-divide-fasting-weight',
  'blind-complementary-wildfire',
  'blind-complementary-coral',
  'blind-complex-telehealth',
  'blind-complex-carbon-pricing',
] as const

describe('targeted recall recovery blind fixtures', () => {
  it(
    'runs Phase A targeted fixtures with reduced stability runs',
    async () => {
      const result = await runBlindTest({
        fixtureFilter: [...TARGETED_FIXTURES],
        skipGraduationRegression: true,
        skipMcpRepro: true,
      })
      expect(result.snapshot.fixtures.length).toBe(TARGETED_FIXTURES.length)
      console.log(
        `Targeted recall exit=${result.snapshot.exitStatus} precision=${result.snapshot.aggregate.precisionLabel} recall=${result.snapshot.aggregate.recallLabel}`,
      )
      for (const fixture of result.snapshot.fixtures) {
        console.log(
          `${fixture.fixtureId}: relationshipQuality=${fixture.relationshipQuality} failure=${fixture.failureAttribution}`,
        )
      }
    },
    3600000,
  )
})
