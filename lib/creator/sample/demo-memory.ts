import type { ChannelMemory, AudienceQuestion, CreatorLearning } from '@/lib/creator/intelligence/types'
import { DEMO_CHANNEL_ID } from '@/lib/creator/config'
import { DEMO_BRAIN } from '@/lib/creator/sample/demo-channel'
import { buildPositionHistory } from '@/lib/creator/intelligence/position-history'
import { saveChannelMemory } from '@/lib/creator/storage/local-store'

const now = new Date().toISOString()

export const DEMO_AUDIENCE: AudienceQuestion[] = [
  {
    id: 'aud_capex_returns',
    channelId: DEMO_CHANNEL_ID,
    label: 'When will AI CAPEX generate returns?',
    frequency: 47,
    videoIds: ['vid_ai_bubble_2025', 'vid_capex_cycle'],
    trend: 'rising',
    representativePhrases: [
      'AI 회사 언제 돈 벌어요?',
      'CAPEX 회수 가능함?',
      '그래서 수익은 언제?',
    ],
  },
  {
    id: 'aud_nvidia_buy',
    channelId: DEMO_CHANNEL_ID,
    label: 'Should I buy NVIDIA now?',
    frequency: 31,
    videoIds: ['vid_nvidia_2024'],
    trend: 'stable',
    representativePhrases: ['지금 NVIDIA 사야 하나?', '엔비디아 아직 안 늦었나?'],
  },
]

export const DEMO_LEARNINGS: CreatorLearning[] = [
  {
    id: 'learn_intro_retention',
    channelId: DEMO_CHANNEL_ID,
    statement: 'Analytical deep-dives with 12–15s intros retain better than 25s+ hooks on this channel.',
    confidence: 'some_evidence',
    supportingOutcomes: ['proj_demo_ai_bubble_v1'],
    contradictingOutcomes: [],
    linkedDecisionIds: [],
    createdAt: now,
  },
]

export async function seedDemoChannelMemory(): Promise<ChannelMemory> {
  const positionHistory = buildPositionHistory(DEMO_BRAIN, DEMO_BRAIN.positions)
  const memory: ChannelMemory = {
    channelId: DEMO_CHANNEL_ID,
    positionHistory,
    audienceQuestions: DEMO_AUDIENCE,
    learnings: DEMO_LEARNINGS,
    performanceBaseline: {
      avgViewsPerDay: 4200,
      avgCtr: 0.062,
      avgRetention30s: 0.58,
    },
    updatedAt: now,
  }
  await saveChannelMemory(memory)
  return memory
}
