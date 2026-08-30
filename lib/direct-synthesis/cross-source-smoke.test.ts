import { describe, it, expect } from 'vitest'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { loadBaselineFixture, loadFixtureSources } from '@/lib/reasoning/eval/fixtures'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'

const HAS_KEY = isLiveEvalEnvironmentReady()

describe.runIf(HAS_KEY)('cross-source synthesis smoke', () => {
  it(
    'surfaces AGREE from three related sources on remote work',
    async () => {
      const fixture = loadBaselineFixture('clear-agreement')
      const sources = loadFixtureSources(fixture)

      const run = await runDirectSynthesisPipeline({
        centralQuestion: fixture.question,
        sources,
        outputLanguage: fixture.outputLanguage ?? 'en',
      })

      const result = run.result
      expect(result.directAnswer.length).toBeGreaterThan(20)
      expect(result.directAnswer.toLowerCase()).not.toMatch(/video 1 says/)

      const crossSourceSignals =
        result.agreements.length +
        result.disagreements.length +
        result.complementaryViews.length +
        result.uniqueViews.length +
        (result.insight ? 1 : 0)
      expect(crossSourceSignals).toBeGreaterThan(0)

      const comparableUsed = [
        ...result.agreements,
        ...result.disagreements,
        ...result.complementaryViews,
        ...result.uniqueViews,
      ].flatMap((r) => r.sourceIds)
      expect(comparableUsed).not.toContain('source_3')

      expect(run.cost.llmCalls).toBeLessThanOrEqual(6)
    },
    300000,
  )
})
