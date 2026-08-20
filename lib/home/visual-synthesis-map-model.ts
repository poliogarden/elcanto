import type { Voice } from '@/lib/types/voice'

export type MapRelationshipType =
  | 'shared'
  | 'different'
  | 'contradiction'
  | 'parallel'
  | 'independent'

export type SourceNode = {
  id: string
  voiceIndex: number
  title: string
  summary?: string
  thumbnail?: string
  channel?: string
  duration?: string
  filled: boolean
  sample?: boolean
}

export type RelationshipEdge = {
  id: string
  fromId: string
  toId: string
  type: MapRelationshipType
  strength: number
  explanation: string
}

export type EmergentInsight = {
  id: string
  statement: string
  explanation: string
  confidence: number
  supportingRelationshipIds: string[]
}

export type VisualSynthesisMapMode = 'demo' | 'empty' | 'partial' | 'ready'

export type VisualSynthesisMapData = {
  mode: VisualSynthesisMapMode
  sources: SourceNode[]
  edges: RelationshipEdge[]
  insight: EmergentInsight | null
  statusMessage?: string
  showNoStrongRelationship?: boolean
}

export const RELATIONSHIP_LABELS: Record<MapRelationshipType, string> = {
  shared: 'SHARED',
  different: 'DIFFERENT',
  contradiction: 'CONTRADICTION',
  parallel: 'PARALLEL',
  independent: 'INDEPENDENT',
}

const DEMO_THUMB =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="#f4f1ea" width="320" height="180"/><text x="160" y="92" text-anchor="middle" font-family="monospace" font-size="14" fill="#6b6560">SAMPLE</text></svg>',
  )

export const DEMO_SYNTHESIS_MAP: VisualSynthesisMapData = {
  mode: 'demo',
  sources: [
    {
      id: 'demo_1',
      voiceIndex: 1,
      title: 'AI lowers the cost of building software',
      summary: 'Production software becomes cheaper to create.',
      channel: 'Tech Talk Daily',
      duration: '48:12',
      thumbnail: DEMO_THUMB,
      filled: true,
      sample: true,
    },
    {
      id: 'demo_2',
      voiceIndex: 2,
      title: 'Small teams gain leverage with AI tools',
      summary: 'Fewer people can ship larger systems.',
      channel: 'Startup Field Notes',
      duration: '36:05',
      thumbnail: DEMO_THUMB,
      filled: true,
      sample: true,
    },
    {
      id: 'demo_3',
      voiceIndex: 3,
      title: 'Distribution becomes the real bottleneck',
      summary: 'Getting attention matters more than building.',
      channel: 'Market Patterns',
      duration: '52:30',
      thumbnail: DEMO_THUMB,
      filled: true,
      sample: true,
    },
  ],
  edges: [
    {
      id: 'demo_e12',
      fromId: 'demo_1',
      toId: 'demo_2',
      type: 'shared',
      strength: 0.78,
      explanation: 'Both argue that AI reduces the cost of producing software.',
    },
    {
      id: 'demo_e23',
      fromId: 'demo_2',
      toId: 'demo_3',
      type: 'different',
      strength: 0.62,
      explanation: 'One focuses on leverage; the other on distribution as the new constraint.',
    },
  ],
  insight: {
    id: 'demo_insight',
    statement:
      'When creation becomes cheap, advantage shifts from building to choosing what deserves to exist.',
    explanation:
      'Visible only when these three arguments are read together — not stated fully in any single source.',
    confidence: 0.74,
    supportingRelationshipIds: ['demo_e12', 'demo_e23'],
  },
}

export function buildMapFromVoices(voices: Voice[]): VisualSynthesisMapData {
  if (voices.length === 0) {
    return {
      mode: 'empty',
      sources: [],
      edges: [],
      insight: null,
      statusMessage: 'Add 2 or more voices to discover what emerges between them.',
    }
  }

  const filled: SourceNode[] = voices.map((v) => ({
    id: v.id,
    voiceIndex: v.n,
    title: v.title,
    thumbnail: v.thumbnail,
    channel: v.channel,
    duration: v.duration,
    filled: true,
  }))

  if (voices.length === 1) {
    return {
      mode: 'partial',
      sources: filled,
      edges: [],
      insight: null,
      statusMessage: 'One voice added. Add another to begin comparison.',
    }
  }

  if (voices.length === 2) {
    return {
      mode: 'partial',
      sources: filled,
      edges: [],
      insight: null,
      statusMessage: 'Two voices ready — synthesize to map their relationship.',
    }
  }

  return {
    mode: 'ready',
    sources: filled,
    edges: [],
    insight: null,
    statusMessage: `${voices.length} voices · ready to synthesize`,
  }
}

export function shouldShowDemoAnimation(voices: Voice[]): boolean {
  return voices.length === 0
}
