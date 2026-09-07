import type { ChannelBrain, ContentOpportunity, CreatorChannel } from '@/lib/creator/types'
import { DEMO_CHANNEL_ID, DEMO_USER_ID } from '@/lib/creator/config'
import { saveBrain, saveChannel, saveOpportunityCache } from '@/lib/creator/storage/local-store'
import { seedDemoChannelMemory } from '@/lib/creator/sample/demo-memory'
import { enrichOpportunities } from '@/lib/creator/intelligence/opportunity-engine'

const now = new Date().toISOString()

export const DEMO_CHANNEL: CreatorChannel = {
  id: DEMO_CHANNEL_ID,
  userId: DEMO_USER_ID,
  youtubeChannelId: 'UC_demo_ai_bubble',
  title: 'Tech Macro Daily',
  description: 'AI, markets, and technology macro analysis.',
  thumbnailUrl: null,
  subscriberCount: 128000,
  videoCount: 47,
  indexingStatus: 'ready',
  indexingProgress: {
    phase: 'Ready',
    imported: 12,
    analyzed: 12,
    total: 12,
  },
  brandKit: {
    captionStyle: 'bold-white-bottom',
    voiceProfileId: 'nova-en',
  },
  styleProfile: {
    avgIntroSec: 18,
    tone: 'analytical',
    pacing: 'medium',
  },
  createdAt: now,
  updatedAt: now,
  isSample: true,
}

export const DEMO_BRAIN: ChannelBrain = {
  channelId: DEMO_CHANNEL_ID,
  topics: [
    {
      id: 'topic_ai_bubble',
      channelId: DEMO_CHANNEL_ID,
      label: 'AI Bubble',
      description: 'Valuation, capex, and sustainability of AI infrastructure spending.',
      videoIds: ['vid_nvidia_2024', 'vid_ai_bubble_2025', 'vid_capex_cycle'],
    },
    {
      id: 'topic_semis',
      channelId: DEMO_CHANNEL_ID,
      label: 'Semiconductors',
      description: 'NVIDIA, TSMC, and supply chain dynamics.',
      videoIds: ['vid_nvidia_2024'],
    },
  ],
  positions: [
    {
      id: 'pos_nvidia_bull',
      channelId: DEMO_CHANNEL_ID,
      videoId: 'vid_nvidia_2024',
      topicId: 'topic_semis',
      label: 'NVIDIA demand remains structural',
      statement:
        'Data center GPU demand is not purely cyclical hype — inference workloads are compounding.',
      evidenceRef: 'vid_nvidia_2024:720',
      timestamp: 720,
      endTime: 780,
      publishedAt: '2024-08-15T00:00:00Z',
    },
    {
      id: 'pos_bubble_skeptic',
      channelId: DEMO_CHANNEL_ID,
      videoId: 'vid_ai_bubble_2025',
      topicId: 'topic_ai_bubble',
      label: 'AI capex may be front-loaded',
      statement:
        'Hyperscaler capex growth cannot outpace revenue conversion indefinitely without a correction.',
      evidenceRef: 'vid_ai_bubble_2025:340',
      timestamp: 340,
      endTime: 410,
      publishedAt: '2025-01-20T00:00:00Z',
    },
    {
      id: 'pos_followup_open',
      channelId: DEMO_CHANNEL_ID,
      videoId: 'vid_ai_bubble_2025',
      topicId: 'topic_ai_bubble',
      label: 'Six-month revisit promised',
      statement: 'I will revisit this thesis when Q2 earnings confirm or deny the capex narrative.',
      evidenceRef: 'vid_ai_bubble_2025:890',
      timestamp: 890,
      endTime: 920,
      publishedAt: '2025-01-20T00:00:00Z',
    },
  ],
  openLoops: [
    {
      id: 'loop_capex_revisit',
      channelId: DEMO_CHANNEL_ID,
      label: 'Capex thesis revisit',
      description: 'Promised follow-up when Q2 earnings land — audience expects update.',
      sourceVideoId: 'vid_ai_bubble_2025',
      sourceTimestamp: 890,
    },
    {
      id: 'loop_nvidia_connection',
      channelId: DEMO_CHANNEL_ID,
      label: 'NVIDIA vs macro bubble',
      description: 'Connect structural demand thesis with bubble skepticism.',
      sourceVideoId: 'vid_nvidia_2024',
      sourceTimestamp: 720,
    },
  ],
  opportunities: [],
  builtAt: now,
}

export const DEMO_OPPORTUNITIES: ContentOpportunity[] = [
  {
    id: 'opp_ai_bubble_followup',
    channelId: DEMO_CHANNEL_ID,
    title: 'AI 버블, 정말 끝났을까?',
    thesis:
      'NVIDIA 구조적 수요 논지와 capex 과열 경고를 함께 놓으면, “버블 종료”가 아니라 “버블의 형태 변화”가 더 정확한 프레임이다.',
    whyNow: [
      '3개월 전 영상에서 Q2 실적 때 다시 보겠다고 약속한 미완성 맥락',
      'NVIDIA 영상과 AI 버블 영상이 같은 주제 클러스터에 속함',
      '댓글에서 “그래서 지금 사야 하나?” 질문 반복',
      '최근 관련 영상 조회수가 채널 평균 대비 높음',
    ],
    linkedTopicIds: ['topic_ai_bubble', 'topic_semis'],
    linkedPositionIds: ['pos_nvidia_bull', 'pos_bubble_skeptic', 'pos_followup_open'],
    linkedOpenLoopIds: ['loop_capex_revisit', 'loop_nvidia_connection'],
    strength: 0.92,
  },
  {
    id: 'opp_capex_math',
    channelId: DEMO_CHANNEL_ID,
    title: 'AI CAPEX는 언제 회수되는가?',
    thesis: 'Hyperscaler capex와 inference revenue의 교차점을 숫자로 검증한다.',
    whyNow: [
      'Bubble skeptic position이 capex 회수 시점을 명시적으로 요구',
      '데이터 시각화 콘텐츠가 채널에서 잘 작동함',
    ],
    linkedTopicIds: ['topic_ai_bubble'],
    linkedPositionIds: ['pos_bubble_skeptic'],
    linkedOpenLoopIds: ['loop_capex_revisit'],
    strength: 0.78,
  },
]

export async function seedDemoCreatorChannel(): Promise<void> {
  await saveChannel(DEMO_CHANNEL)
  const memory = await seedDemoChannelMemory()
  const enriched = enrichOpportunities(DEMO_OPPORTUNITIES, memory, DEMO_BRAIN.positions)
  const brain: ChannelBrain = {
    ...DEMO_BRAIN,
    opportunities: enriched,
  }
  await saveBrain(brain)
  await saveOpportunityCache(DEMO_CHANNEL_ID, enriched)
}
