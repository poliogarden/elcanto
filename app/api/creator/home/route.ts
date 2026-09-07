import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import {
  loadBrain,
  loadChannelMemory,
  loadOpportunityCache,
} from '@/lib/creator/storage/local-store'
import { listChannelsForUser, listProjectsForChannel } from '@/lib/creator/repository'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_USER_ID } from '@/lib/creator/config'
import { enrichOpportunities } from '@/lib/creator/intelligence/opportunity-engine'

export async function GET() {
  const userId = await resolveCreatorUserId()
  let channels = await listChannelsForUser(userId)
  if (channels.length === 0) {
    await seedDemoCreatorChannel()
    channels = await listChannelsForUser(DEMO_USER_ID)
  }

  const channel = channels[0]
  if (!channel) {
    return NextResponse.json({ channels: [], recommended: null, opportunities: [] })
  }

  const brain = await loadBrain(channel.id)
  const memory = await loadChannelMemory(channel.id)
  const rawOpps = (await loadOpportunityCache(channel.id)) ?? brain?.opportunities ?? []
  const opportunities = memory && brain
    ? enrichOpportunities(rawOpps, memory, brain.positions)
    : rawOpps
  const recommended = opportunities[0] ?? null
  const projects = await listProjectsForChannel(channel.id)
  const activeProjects = projects.filter((p) => p.status !== 'published').slice(0, 3)

  const latestLearning = memory?.learnings[memory.learnings.length - 1] ?? null
  const latestPerformance = memory?.performanceBaseline ?? null

  return NextResponse.json({
    channels,
    channel,
    brain,
    memory,
    recommended,
    opportunities: opportunities.slice(0, 5),
    activeProjects,
    latestLearning,
    latestPerformance,
    insight: buildFirstInsight(memory, brain),
  })
}

function buildFirstInsight(
  memory: Awaited<ReturnType<typeof loadChannelMemory>>,
  brain: Awaited<ReturnType<typeof loadBrain>>,
): string | null {
  if (!memory || !brain) return null
  const history = memory.positionHistory
  const loop = brain.openLoops[0]
  const audience = memory.audienceQuestions[0]
  if (!history.length || !loop || !audience) return null

  const past = history.find((h) => h.changeFromPrevious === 'MODIFIED') ?? history[0]
  return `You said "${past.label}" in a prior video. Since then, market context shifted. Your viewers are now asking: "${audience.label}". This may be your next video.`
}
