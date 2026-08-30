import { describe, expect, it } from 'vitest'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { runBlindTest } from '@/lib/reasoning/eval/run-blind-test'

loadProjectEnv()

const PHASE_B_FIXTURES = ['blind-same-topic-solar', 'blind-same-topic-quantum'] as const

describe('Phase B same-topic precision regression', () => {
  it(
    'runs same-topic blind fixtures — no false agreement/divide/complementary',
    async () => {
      const result = await runBlindTest({
        fixtureFilter: [...PHASE_B_FIXTURES],
        skipGraduationRegression: true,
        skipMcpRepro: true,
      })
      expect(result.snapshot.fixtures.length).toBe(PHASE_B_FIXTURES.length)

      let falseAgreement = 0
      let falseDivide = 0
      let falseComplementary = 0
      for (const fixture of result.snapshot.fixtures) {
        const run = fixture.runs[fixture.runs.length - 1]
        falseAgreement += run.metrics.falseAgreement
        falseDivide += run.metrics.falseDivide
        falseComplementary += run.metrics.falseComplementary
        console.log(
          `${fixture.fixtureId}: relQuality=${fixture.relationshipQuality} agreement=${run.metrics.agreement} divide=${run.metrics.divide} complementary=${run.metrics.complementary} falseA=${run.metrics.falseAgreement} falseD=${run.metrics.falseDivide} falseC=${run.metrics.falseComplementary}`,
        )
      }
      console.log(
        `Phase B totals: falseAgreement=${falseAgreement} falseDivide=${falseDivide} falseComplementary=${falseComplementary}`,
      )
      expect(falseAgreement).toBe(0)
      expect(falseDivide).toBe(0)
      expect(falseComplementary).toBe(0)
    },
    1800000,
  )
})
