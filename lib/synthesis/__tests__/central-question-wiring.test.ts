import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GENERIC_CENTRAL_QUESTION,
  hasUserSubmittedQuestion,
  resolveJobCentralQuestion,
} from '@/lib/synthesis/resolve-central-question'
import type { SynthesisDraft } from '@/lib/types/synthesis-draft'

const CASE_A_QUESTION =
  '의사결정에서 53%의 정확도를 달성하는 것이 정말로 뛰어난 능력을 의미하는가?'

function draftWithQuestion(question?: string): SynthesisDraft {
  return {
    voices: [
      {
        id: '1',
        n: 1,
        youtubeId: 'BFjEDxcYmXQ',
        url: 'https://www.youtube.com/watch?v=BFjEDxcYmXQ',
        title: '53%만 맞아도 뛰어난 사람이다',
        channel: 'PerceptionKey',
        duration: '—',
      },
    ],
    customPrompt: question,
    outputLanguage: 'ko',
  }
}

describe('resolveJobCentralQuestion', () => {
  it('uses draft customPrompt when present', () => {
    const draft = draftWithQuestion(CASE_A_QUESTION)
    expect(resolveJobCentralQuestion(draft)).toBe(CASE_A_QUESTION)
  })

  it('does not replace user question with generic fallback', () => {
    const draft = draftWithQuestion(CASE_A_QUESTION)
    expect(resolveJobCentralQuestion(draft)).not.toBe(DEFAULT_GENERIC_CENTRAL_QUESTION)
    expect(hasUserSubmittedQuestion(draft)).toBe(true)
  })

  it('falls back to document.userQuestion when draft has no prompt', () => {
    const draft = draftWithQuestion()
    expect(
      resolveJobCentralQuestion(draft, { userQuestion: CASE_A_QUESTION }),
    ).toBe(CASE_A_QUESTION)
  })

  it('uses generic fallback only when no question exists', () => {
    const draft = draftWithQuestion()
    expect(resolveJobCentralQuestion(draft)).toBe(DEFAULT_GENERIC_CENTRAL_QUESTION)
    expect(hasUserSubmittedQuestion(draft)).toBe(false)
  })
})
