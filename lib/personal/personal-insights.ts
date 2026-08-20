import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAIApiKey } from '@/lib/ai/config'
import { callStructured } from '@/lib/ai/structured-call'
import type {
  BlindSpot,
  ImportedPlaylist,
  PersonalCluster,
  PersonalGap,
  PersonalRecommendation,
  PersonalSignal,
} from '@/lib/types/personal'
import { clusterSignals, enrichSignalTopics, buildTasteByWindow } from '@/lib/personal/taste-engine'

const PersonalInsightSchema = z.object({
  blindSpots: z.array(
    z.object({
      id: z.string(),
      assumedPerspective: z.string(),
      missingPerspective: z.string(),
    }),
  ),
  gaps: z.array(
    z.object({
      id: z.string(),
      explored: z.string(),
      notYetExplored: z.string(),
      question: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['go_deeper', 'connect', 'counter', 'blind_spot', 'new_direction']),
      searchQuery: z.string(),
      title: z.string(),
      reason: z.string(),
    }),
  ),
  inferredPatterns: z.array(z.string()),
})

const REC_LABELS: Record<string, string> = {
  go_deeper: 'Go deeper',
  connect: 'Connect',
  counter: 'Counter',
  blind_spot: 'Blind spot',
  new_direction: 'New direction',
}

export async function buildPersonalInsights(
  signals: PersonalSignal[],
  clusters: PersonalCluster[],
): Promise<{
  blindSpots: BlindSpot[]
  gaps: PersonalGap[]
  recommendations: PersonalRecommendation[]
  inferredPatterns: string[]
}> {
  if (signals.length < 3) {
    return { blindSpots: [], gaps: [], recommendations: [], inferredPatterns: [] }
  }

  const sample = signals.slice(0, 40).map((s) => {
    const e = enrichSignalTopics(s)
    return {
      source: s.source,
      title: s.title,
      channel: s.channel,
      topics: e.topics,
      signalAt: s.signalAt,
    }
  })

  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
  const system = `You analyze a user's intellectual taste from their YouTube subscriptions, likes, and elcanto activity.

RULES:
- Do NOT infer political, moral, or sensitive personal attributes
- Blind spots describe MISSING PERSPECTIVES in their content set, not user traits
- Use "MISSING FROM YOUR CURRENT SOURCES" framing
- Recommendations must include specific YouTube search queries and WHY THIS explanations
- Do NOT use generic "recommended for you"
- If signals are too sparse, return empty arrays
- inferredPatterns: deeper structural patterns across interests (not generic "technology is important")

Return valid JSON.`

  const user = `Signals (${signals.length} total, sample):
${JSON.stringify(sample, null, 2)}

Clusters:
${JSON.stringify(clusters, null, 2)}`

  try {
    const parsed = await callStructured({
      openai,
      role: 'synthesis',
      operation: 'PERSONAL_INSIGHT',
      system,
      user,
      schema: PersonalInsightSchema,
      schemaName: 'personal_insights',
    })

    if (!parsed) return { blindSpots: [], gaps: [], recommendations: [], inferredPatterns: [] }

    return {
      blindSpots: parsed.blindSpots,
      gaps: parsed.gaps,
      recommendations: parsed.recommendations.map((r) => ({
        ...r,
        typeLabel: REC_LABELS[r.type] ?? r.type,
      })),
      inferredPatterns: parsed.inferredPatterns,
    }
  } catch {
    return { blindSpots: [], gaps: [], recommendations: [], inferredPatterns: [] }
  }
}

export async function buildPersonalProfileFromSignals(
  userId: string,
  signals: PersonalSignal[],
  youtubeConnected: boolean,
  lastSyncedAt: string | null,
  importedPlaylists: ImportedPlaylist[] = [],
) {
  const tasteEngine = await import('@/lib/personal/taste-engine')
  const clusters = clusterSignals(signals)
  const tasteByWindow = buildTasteByWindow(signals)
  const window30 = tasteByWindow['30d']
  const { thread, supporting } = tasteEngine.inferCurrentThread(signals, clusters, '30d')
  const { nodes, edges } = tasteEngine.buildKnowledgeGraph(signals)
  const personalSynthesis = tasteEngine.buildPersonalSynthesisStatement(signals, clusters)
  const insights = await buildPersonalInsights(signals, clusters)

  return {
    userId,
    youtubeConnected,
    lastSyncedAt,
    signalCount: signals.length,
    currentThread: thread,
    supportingInterests: supporting,
    emerging: window30.emerging,
    declining: window30.declining,
    interestShift: window30.interestShift,
    tasteByWindow,
    clusters,
    personalSynthesis,
    graphNodes: nodes,
    graphEdges: edges,
    blindSpots: insights.blindSpots,
    gaps: insights.gaps,
    recommendations: insights.recommendations,
    inferredPatterns: insights.inferredPatterns,
    importedPlaylists,
  }
}
