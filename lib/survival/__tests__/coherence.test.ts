import { describe, expect, it } from 'vitest'
import {
  ensureMinimumIncluded,
  isAbstractDisagreementLabel,
  partitionSourcesByCoherence,
} from '@/lib/survival/coherence'
import type { SourceAnalysis } from '@/lib/types/source'

const baseSource = (id: string, title: string): SourceAnalysis => ({
  sourceId: id,
  videoId: id,
  voiceIndex: Number(id.replace('source_', '')),
  title,
  summary: '',
  thesis: '',
  topics: [],
  claims: [],
  entities: [],
  conclusions: [],
  implications: [],
  evidence: [],
  stance: null,
})

describe('partitionSourcesByCoherence', () => {
  it('excludes off_topic sources', () => {
    const sources = [baseSource('source_1', 'MCP intro'), baseSource('source_2', 'Random shorts')]
    const coherence = {
      centralQuestion: 'What is MCP?',
      coherenceLevel: 'moderate' as const,
      assessments: [
        {
          sourceId: 'source_1',
          videoId: 'source_1',
          voiceIndex: 1,
          relevance: 'on_topic' as const,
          reason: 'Directly about MCP',
        },
        {
          sourceId: 'source_2',
          videoId: 'source_2',
          voiceIndex: 2,
          relevance: 'off_topic' as const,
          reason: 'Motivational shorts',
        },
      ],
    }
    const { included, excluded } = partitionSourcesByCoherence(sources, coherence, [
      { channel: 'a' },
      { channel: 'b' },
    ])
    expect(included).toHaveLength(1)
    expect(excluded).toHaveLength(1)
    expect(excluded[0].title).toBe('Random shorts')
  })
})

describe('isAbstractDisagreementLabel', () => {
  it('flags abstract labels without claim text', () => {
    expect(isAbstractDisagreementLabel('Focus on Impact', '')).toBe(true)
    expect(isAbstractDisagreementLabel('Focus on Discussions', '')).toBe(true)
  })

  it('allows labels when claim text is present', () => {
    expect(
      isAbstractDisagreementLabel(
        'Focus on Impact',
        'MCP reduces integration complexity between AI tools.',
      ),
    ).toBe(false)
  })
})

describe('ensureMinimumIncluded', () => {
  it('keeps at least 2 included when possible', () => {
    const sources = [
      baseSource('source_1', 'A'),
      baseSource('source_2', 'B'),
      baseSource('source_3', 'C'),
    ]
    const assessments = new Map([
      [
        'source_1',
        {
          sourceId: 'source_1',
          videoId: 'source_1',
          voiceIndex: 1,
          relevance: 'on_topic' as const,
          reason: '',
        },
      ],
      [
        'source_2',
        {
          sourceId: 'source_2',
          videoId: 'source_2',
          voiceIndex: 2,
          relevance: 'off_topic' as const,
          reason: '',
        },
      ],
      [
        'source_3',
        {
          sourceId: 'source_3',
          videoId: 'source_3',
          voiceIndex: 3,
          relevance: 'partial' as const,
          reason: '',
        },
      ],
    ])
    const result = ensureMinimumIncluded(
      sources,
      [sources[0]],
      [
        {
          sourceId: 'source_2',
          videoId: 'source_2',
          voiceIndex: 2,
          title: 'B',
          reason: 'off',
        },
      ],
      assessments,
      [{ channel: 'a' }, { channel: 'b' }, { channel: 'c' }],
    )
    expect(result.included.length).toBeGreaterThanOrEqual(2)
  })
})
