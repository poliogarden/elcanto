import { describe, expect, it } from 'vitest'
import { wireKeyEvidenceFromSnippets } from '@/lib/direct-synthesis/wire-key-evidence'
import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'

describe('wireKeyEvidenceFromSnippets', () => {
  const snippets: EvidenceSnippet[] = [
    {
      ref: 'source_1:e1',
      sourceId: 'source_1',
      videoId: 'BFjEDxcYmXQ',
      text: 'is right in about 53%',
      startTime: 22040,
      endTime: 27680,
    },
    {
      ref: 'source_1:e2',
      sourceId: 'source_1',
      videoId: 'BFjEDxcYmXQ',
      text: "about 53% of the time. If you're right",
      startTime: 38640,
      endTime: 41440,
    },
  ]

  it('maps paraphrased LLM evidence to original transcript snippets', () => {
    const wired = wireKeyEvidenceFromSnippets(
      [
        {
          text: '경쟁하는 것, 특히 연설과 토론...',
          startTime: 0,
          endTime: 0,
        },
        {
          text: '중요한 삶의 기술',
          startTime: 15200,
          endTime: 15200,
        },
      ],
      snippets,
    )

    expect(wired[0]?.text).toBe('is right in about 53%')
    expect(wired[0]?.startTime).toBe(22040)
    expect(wired[1]?.text).toContain('about 53% of the time')
    expect(wired[1]?.startTime).toBe(38640)
  })

  it('preserves transcript segment timestamp at 22s lineage', () => {
    const wired = wireKeyEvidenceFromSnippets(
      [{ text: 'unrelated paraphrase', startTime: 0, endTime: 0 }],
      [snippets[0]],
    )

    expect(wired[0]?.text).toBe('is right in about 53%')
    expect(wired[0]?.startTime).toBe(22040)
  })

  it('keeps original transcript text for renderer', () => {
    const wired = wireKeyEvidenceFromSnippets([], snippets)
    expect(wired.every((e) => /53%/.test(e.text))).toBe(true)
    expect(wired.every((e) => !/[가-힣]/.test(e.text))).toBe(true)
  })
})
