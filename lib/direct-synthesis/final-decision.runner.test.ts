import { describe, it, expect } from 'vitest'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'
import { loadCaseInput } from '@/lib/direct-synthesis/job-loader'
import { runAllFinalDecisionCases } from '@/lib/direct-synthesis/run-cases'

const HAS_KEY = isLiveEvalEnvironmentReady()

describe('final product decision cases', () => {
  it('defines three cases', () => {
    expect(FINAL_DECISION_CASES.length).toBe(3)
  })

  it('loads case A from real YouTube job', async () => {
    const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
    expect(loaded.sources.length).toBe(3)
    expect(loaded.centralQuestion).toContain('53%')
    expect(loaded.document?.reasoning?.mode).toBe('multi')
  })

  it('loads case B/C benchmark fixtures', async () => {
    const b = await loadCaseInput(FINAL_DECISION_CASES[1])
    const c = await loadCaseInput(FINAL_DECISION_CASES[2])
    expect(b.sources.length).toBeGreaterThanOrEqual(2)
    expect(c.sources.length).toBeGreaterThanOrEqual(2)
  })
})

describe.runIf(HAS_KEY)('final product decision live run', () => {
  it(
    'runs Case A only and writes final-direct-fix report',
    async () => {
      const { writeFinalDirectFixReport } = await import(
        '@/lib/direct-synthesis/write-final-fix-report'
      )
      const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
      const directRun = await import('@/lib/direct-synthesis/run-cases').then((m) =>
        m.runFinalDecisionCaseDirectOnly('case-a'),
      )

      const source1 = directRun.result.sourceAnswers.find((s) => s.sourceId === 'source_1')
      expect(source1).toBeDefined()

      await writeFinalDirectFixReport({
        fix1RootCause:
          'C. EVIDENCE_RETRIEVAL_MISS — Korean central question had zero lexical overlap with English transcript; numeric anchor (53%) was not prioritized, so 53% segments were not passed to per-source answer.',
        fix1Change:
          'evidence.ts — numeric anchor extraction (53, 53%) with mandatory inclusion in retrieved snippets before token overlap ranking.',
        fix2RootCause:
          'Implementation bug — final directAnswer was taken from pre-validation synthesis draft; removed unsupported relationships did not update the answer.',
        fix2Change:
          'finalize-validated-answer.ts + pipeline.ts — regenerate directAnswer only from validated structures and per-source answers after evidence validation.',
        caseARun: directRun,
        centralQuestion: loaded.centralQuestion,
      })

      expect(directRun.result.directAnswer.length).toBeGreaterThan(20)
    },
    300000,
  )

  it.skip(
    'runs all three cases and writes reports',
    async () => {
      const results = await runAllFinalDecisionCases()
      expect(results.length).toBe(3)
      for (const r of results) {
        expect(r.v2Markdown.length).toBeGreaterThan(50)
        expect(r.directMarkdown.length).toBeGreaterThan(50)
      }
    },
    900000,
  )
})
