import { describe, it, expect } from 'vitest'
import {
  retrieveQuestionFocusedEvidence,
  extractNumericAnchors,
} from '@/lib/direct-synthesis/evidence'
import { buildFinalDirectAnswer } from '@/lib/direct-synthesis/finalize-validated-answer'
import { loadCaseInput } from '@/lib/direct-synthesis/job-loader'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'

describe('question-focused evidence retrieval', () => {
  it('extracts numeric anchors from Korean question', () => {
    const anchors = extractNumericAnchors(
      '의사결정에서 53%의 정확도를 달성하는 것이 정말로 뛰어난 능력을 의미하는가?',
    )
    expect(anchors).toContain('53')
    expect(anchors).toContain('53%')
  })

  it('includes 53% transcript segments for Case A source_1', async () => {
    const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
    const source1 = loaded.sources.find((s) => s.sourceId === 'source_1')
    expect(source1).toBeDefined()

    const snippets = retrieveQuestionFocusedEvidence({
      centralQuestion: loaded.centralQuestion,
      source: source1!,
    })

    const has53 = snippets.some((s) => /53\s*%|53%/.test(s.text))
    expect(has53).toBe(true)
  })
})

describe('validated final answer contract', () => {
  it('drops unsupported disagreement claims from finalized answer text', () => {
    const answer = buildFinalDirectAnswer({
      centralQuestion: 'Does remote work affect productivity?',
      sourceAnswers: [
        {
          sourceId: 'source_1',
          sourceTitle: 'A',
          answerability: 'DIRECT',
          answer: 'Remote work may increase productivity.',
          keyEvidence: [{ text: 'fewer office distractions', startTime: 45, endTime: null }],
          uncertainty: null,
          confidence: 0.8,
        },
        {
          sourceId: 'source_2',
          sourceTitle: 'B',
          answerability: 'DIRECT',
          answer: 'Remote work may decrease productivity.',
          keyEvidence: [{ text: 'home interruptions', startTime: 35, endTime: null }],
          uncertainty: null,
          confidence: 0.8,
        },
      ],
      agreements: [],
      disagreements: [],
      complementaryViews: [],
      uniqueViews: [],
      insights: [],
      insight: null,
      nonComparableSources: [],
      uncertainty: ['Evidence is limited.'],
    })

    expect(answer.toLowerCase()).not.toMatch(/contested|disagree|conversely/)
    expect(answer.length).toBeGreaterThan(10)
  })
})
