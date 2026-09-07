import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { listChannelsForUser } from '@/lib/creator/repository'
import {
  loadBrain,
  loadChannelMemory,
  loadOpportunityCache,
} from '@/lib/creator/storage/local-store'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_USER_ID } from '@/lib/creator/config'
import { enrichOpportunities } from '@/lib/creator/intelligence/opportunity-engine'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id: opportunityId } = await params
  const userId = await resolveCreatorUserId()
  let channels = await listChannelsForUser(userId)
  if (channels.length === 0) {
    await seedDemoCreatorChannel()
    channels = await listChannelsForUser(DEMO_USER_ID)
  }
  const channel = channels[0]
  if (!channel) return NextResponse.json({ error: 'No channel' }, { status: 404 })

  const brain = await loadBrain(channel.id)
  const memory = await loadChannelMemory(channel.id)
  const rawOpps = (await loadOpportunityCache(channel.id)) ?? brain?.opportunities ?? []
  const opportunity = rawOpps.find((o) => o.id === opportunityId)
  if (!opportunity || !brain || !memory) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const enriched = enrichOpportunities([opportunity], memory, brain.positions)[0]
  const linkedPositions = brain.positions.filter((p) =>
    opportunity.linkedPositionIds.includes(p.id),
  )
  const linkedLoops = brain.openLoops.filter((l) =>
    opportunity.linkedOpenLoopIds.includes(l.id),
  )

  return NextResponse.json({
    opportunity: enriched,
    why: enriched.whyExplanation,
    signals: enriched.signals,
    signalNote: 'Scores are internal ranking heuristics, not statistical probabilities.',
    linkedPositions: linkedPositions.map((p) => ({
      ...p,
      evidenceLink: `From your video · ${Math.floor(p.timestamp / 60)}:${String(p.timestamp % 60).padStart(2, '0')}`,
    })),
    linkedLoops,
    audienceQuestions: memory.audienceQuestions.filter(
      (q) =>
        opportunity.title.toLowerCase().includes('회수') ||
        opportunity.title.toLowerCase().includes('capex') ||
        q.trend === 'rising',
    ),
    positionHistory: memory.positionHistory.filter((h) =>
      opportunity.linkedPositionIds.includes(h.positionId),
    ),
    learnings: memory.learnings,
  })
}
