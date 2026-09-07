import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { loadBrain, loadOpportunityCache } from '@/lib/creator/storage/local-store'
import { listChannelsForUser } from '@/lib/creator/repository'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_USER_ID } from '@/lib/creator/config'

export async function GET() {
  const userId = await resolveCreatorUserId()
  let channels = await listChannelsForUser(userId)
  if (channels.length === 0) {
    await seedDemoCreatorChannel()
    channels = await listChannelsForUser(DEMO_USER_ID)
  }

  const channel = channels[0]
  if (!channel) return NextResponse.json({ opportunities: [] })

  const brain = await loadBrain(channel.id)
  const opportunities = (await loadOpportunityCache(channel.id)) ?? brain?.opportunities ?? []

  return NextResponse.json({ opportunities, channel })
}
