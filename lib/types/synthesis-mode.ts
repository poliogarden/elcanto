export type SynthesisMode = 'compare' | 'debate' | 'discover' | 'understand'

export const DEFAULT_SYNTHESIS_MODE: SynthesisMode = 'discover'

export const SYNTHESIS_MODE_LABELS: Record<SynthesisMode, string> = {
  compare: 'Compare',
  debate: 'Debate',
  discover: 'Discover',
  understand: 'Understand',
}

export const SYNTHESIS_MODE_FOCUS: Record<SynthesisMode, string> = {
  compare:
    'Focus on shared ideas, meaningful differences, and unique perspectives across sources.',
  debate:
    'Focus on agreement, direct contradiction, supporting evidence, and underlying assumptions.',
  discover:
    'Focus on hidden relationships, cross-source connections, and emergent insights visible only when sources are read together.',
  understand:
    'Focus on the big picture, major claims, contextual relationships, and how arguments fit together.',
}

export function parseSynthesisMode(value: unknown): SynthesisMode {
  if (
    value === 'compare' ||
    value === 'debate' ||
    value === 'discover' ||
    value === 'understand'
  ) {
    return value
  }
  return DEFAULT_SYNTHESIS_MODE
}
