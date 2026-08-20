import { describe, expect, it } from 'vitest'
import {
  deriveSourceReasoning,
  toSynthesisVideoContexts,
} from '@/lib/ai/synthesis-video-context'
import { compactSourcesForPrompt } from '@/lib/ai/compact-prompt'
import type { SourceAnalysis } from '@/lib/types/source'

function minimalSource(id: string): SourceAnalysis {
  return {
    sourceId: id,
    videoId: `vid_${id}`,
    voiceIndex: Number(id.split('_')[1]),
    title: 'Shorts title',
    summary: 'Long summary that repeats thesis content for testing payload size.',
    thesis: 'Thesis about AI and entrepreneurship overlap.',
    topics: ['ai', 'business', 'shorts'],
    claims: [
      {
        id: `${id}_claim_1`,
        sourceId: id,
        statement: 'AI tools lower the barrier to starting online businesses',
        topic: 'ai',
        confidence: 0.9,
        reasoning: 'Because automation reduces manual work',
        evidenceSummary: 'Speaker cites examples',
      },
      {
        id: `${id}_claim_2`,
        sourceId: id,
        statement: 'Hardware products require different go-to-market',
        topic: 'hardware',
        confidence: 0.7,
      },
    ],
    entities: [],
    conclusions: ['Conclusion one', 'Conclusion two'],
    implications: ['Implication one'],
    evidence: [
      { id: 'e1', timestamp: 5, text: 'key quote from transcript' },
      { id: 'e2', timestamp: 12, text: 'second quote' },
    ],
    stance: 'optimistic',
    centralQuestion: 'How is AI changing product building?',
    limitations: ['Short format limits depth'],
    uniquePerspective: 'Focus on indie builders',
  }
}

describe('synthesis video context', () => {
  it('produces smaller payload than full compactSourcesForPrompt', () => {
    const sources = [minimalSource('source_1'), minimalSource('source_2'), minimalSource('source_3')]
    const compact = JSON.stringify(toSynthesisVideoContexts(sources))
    const legacy = JSON.stringify(compactSourcesForPrompt(sources, { maxClaims: 10, maxEvidence: 3 }))
    expect(compact.length).toBeLessThan(legacy.length)
  })

  it('deriveSourceReasoning maps top claims per source', () => {
    const reasoning = deriveSourceReasoning([minimalSource('source_1')])
    expect(reasoning[0].coreClaims.length).toBeGreaterThan(0)
    expect(reasoning[0].coreClaims[0].statement).toContain('AI tools')
  })
})
