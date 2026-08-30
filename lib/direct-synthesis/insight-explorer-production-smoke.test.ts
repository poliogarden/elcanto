import { describe, it, expect } from 'vitest'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { loadBaselineFixture, loadFixtureSources } from '@/lib/reasoning/eval/fixtures'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'

const HAS_KEY = isLiveEvalEnvironmentReady()

const SYNTHESIS_QUESTION =
  '이 영상들을 함께 봤을 때만 발견할 수 있는 insight는 무엇인가?'

describe.runIf(HAS_KEY)('insight explorer production smoke', () => {
  it(
    'produces dynamic insights from cross-source synthesis (clear-agreement fixture)',
    async () => {
      const fixture = loadBaselineFixture('clear-agreement')
      const sources = loadFixtureSources(fixture)

      const run = await runDirectSynthesisPipeline({
        centralQuestion: SYNTHESIS_QUESTION,
        sources,
        outputLanguage: 'ko',
      })

      const result = run.result
      expect(result.questionMode).toBe('SYNTHESIS_QUESTION')
      expect(Array.isArray(result.insights)).toBe(true)
      expect(result.insights.length).toBeLessThanOrEqual(4)

      const sampleTitles = ['Peter Thiel', 'Elon Musk', 'Bill Gates', 'Conventional path']
      for (const title of sampleTitles) {
        const serialized = JSON.stringify(result)
        expect(serialized).not.toContain(title)
      }

      if (result.insights.length > 0) {
        const insight = result.insights[0]
        expect(insight.title.length).toBeGreaterThan(5)
        expect(insight.sourceConcepts.length).toBeGreaterThanOrEqual(2)
        expect(insight.sourceConcepts.every((sc) => sc.evidenceRefs.length > 0)).toBe(
          true,
        )
        expect(
          insight.sourceConcepts.every((sc) =>
            result.evidence.some((e) => e.ref === sc.evidenceRefs[0]),
          ),
        ).toBe(true)
      }

      expect(run.cost.llmCalls).toBeLessThanOrEqual(4)
    },
    300000,
  )
})
