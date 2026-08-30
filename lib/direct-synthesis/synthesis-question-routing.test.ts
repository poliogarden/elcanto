import { describe, expect, it } from 'vitest'
import { buildSynthesisModeSourceAnswers } from '@/lib/direct-synthesis/build-synthesis-mode-source-answers'
import { detectQuestionMode, detectSynthesisIntent } from '@/lib/direct-synthesis/question-mode'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { loadCaseInput } from '@/lib/direct-synthesis/job-loader'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'

const SYNTHESIS_QUESTION = '이 영상들을 함께 봤을 때만 보이는 것은 무엇인가요?'
const HAS_KEY = isLiveEvalEnvironmentReady()

describe('question mode detection', () => {
  it('classifies synthesis comparison questions', () => {
    expect(detectQuestionMode(SYNTHESIS_QUESTION)).toBe('SYNTHESIS_QUESTION')
    expect(detectSynthesisIntent(SYNTHESIS_QUESTION)).toBe('insight')
  })

  it('classifies content questions', () => {
    expect(
      detectQuestionMode(
        '의사결정에서 53%의 정확도를 달성하는 것이 정말로 뛰어난 능력을 의미하는가?',
      ),
    ).toBe('CONTENT_QUESTION')
  })
})

describe('synthesis mode source answers', () => {
  it('does not assign DIRECT answerability', async () => {
    const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
    const answers = buildSynthesisModeSourceAnswers(loaded.sources)
    expect(answers.every((a) => a.answerability !== 'DIRECT')).toBe(true)
    expect(answers.every((a) => a.answerability !== 'PARTIAL')).toBe(true)
    expect(answers.filter((a) => a.answerability === 'CONTEXT_ONLY').length).toBe(3)
    expect(answers[0]?.keyEvidence.length).toBeGreaterThan(0)
  })
})

describe.runIf(HAS_KEY)('synthesis question routing live', () => {
  it(
    'routes synthesis question without per-source DIRECT judgments',
    async () => {
      const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
      const run = await runDirectSynthesisPipeline({
        centralQuestion: SYNTHESIS_QUESTION,
        sources: loaded.sources,
        outputLanguage: 'ko',
      })

      const result = run.result
      expect(result.questionMode).toBe('SYNTHESIS_QUESTION')
      expect(result.sourceAnswers.every((s) => s.answerability !== 'DIRECT')).toBe(true)
      expect(result.sourceAnswers.every((s) => s.answerability !== 'PARTIAL')).toBe(true)
      expect(run.cost.llmCalls).toBeLessThanOrEqual(1)

      if (result.insight) {
        expect(result.insight.sourceIds.length).toBeGreaterThanOrEqual(2)
      }
    },
    300000,
  )
})
