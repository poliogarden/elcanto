import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { getChannelForUser, listProjectsForChannel } from '@/lib/creator/repository'
import { loadBrain, loadChannelMemory } from '@/lib/creator/storage/local-store'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_CHANNEL_ID, DEMO_USER_ID } from '@/lib/creator/config'

export async function GET() {
  const userId = await resolveCreatorUserId()
  await seedDemoCreatorChannel()
  const channel = await getChannelForUser(DEMO_CHANNEL_ID, userId)
  const brain = channel ? await loadBrain(channel.id) : null
  const memory = channel ? await loadChannelMemory(channel.id) : null
  const projects = channel ? await listProjectsForChannel(channel.id) : []

  return NextResponse.json({
    channel,
    brain,
    memory,
    projects,
    positions: brain?.positions ?? [],
    topics: brain?.topics ?? [],
  })
}
