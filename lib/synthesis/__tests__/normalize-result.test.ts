import { describe, expect, it } from 'vitest'
import { normalizeSynthesisResult } from '@/lib/synthesis/normalize-result'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function minimalDoc(overrides: Partial<SynthesisDocument> = {}): SynthesisDocument {
  return {
    id: 'test-id',
    number: 'SYNTHESIS TEST',
    createdAt: new Date().toISOString(),
    status: 'complete',
    voices: [
      {
        voice: {
          id: 'v1',
          n: 1,
          youtubeId: 'abc123',
          url: 'https://www.youtube.com/watch?v=abc123',
          title: 'AI agents explained',
          channel: 'Test Channel',
          duration: '10:00',
          status: 'done',
        },
        analysis: {
          sourceId: 'source_1',
          videoId: 'abc123',
          voiceIndex: 1,
          title: 'AI agents explained',
          summary: 'Summary',
          thesis: 'Thesis',
          claims: [
            {
              id: 'claim_1',
              sourceId: 'source_1',
              statement: 'Agents will change software',
              topic: 'ai',
              confidence: 0.9,
            },
          ],
          evidence: [],
          topics: ['ai'],
          entities: [],
          conclusions: [],
          implications: [],
          stance: null,
        },
      },
    ],
    result: {
      synthesis: {
        synthesisType: 'mixed',
        topic: 'AI agents',
        bottomLine: 'Agents matter.',
        overallConclusion: 'Agents matter.',
        emergentStatement: '',
        sections: [],
        usedSourceIds: ['source_1'],
        sourceContributions: [],
        noStrongRelationship: true,
      },
    } as unknown as SynthesisDocument['result'],
    ...overrides,
  }
}

describe('normalizeSynthesisResult', () => {
  it('rebuilds missing sources from voice analyses', () => {
    const doc = minimalDoc()
    const normalized = normalizeSynthesisResult(doc)

    expect(normalized).not.toBeNull()
    expect(normalized?.sources).toHaveLength(1)
    expect(normalized?.sources[0]?.coreClaims[0]?.statement).toContain('Agents')
  })

  it('returns null when synthesis is missing', () => {
    const doc = minimalDoc({ result: {} as SynthesisDocument['result'] })
    expect(normalizeSynthesisResult(doc)).toBeNull()
  })
})
