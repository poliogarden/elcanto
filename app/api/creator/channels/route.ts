import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { listChannelsForUser, saveChannel } from '@/lib/creator/repository'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_USER_ID } from '@/lib/creator/config'
import type { CreatorChannel } from '@/lib/creator/types'

export async function GET() {
  const userId = await resolveCreatorUserId()
  let channels = await listChannelsForUser(userId)
  if (channels.length === 0) {
    await seedDemoCreatorChannel()
    channels = await listChannelsForUser(DEMO_USER_ID)
  }
  return NextResponse.json({ channels })
}

export async function POST(request: Request) {
  const userId = await resolveCreatorUserId()
  const body = (await request.json()) as {
    youtubeChannelId: string
    title: string
    description?: string
    thumbnailUrl?: string
  }

  const now = new Date().toISOString()
  const channel: CreatorChannel = {
    id: randomUUID(),
    userId,
    youtubeChannelId: body.youtubeChannelId,
    title: body.title,
    description: body.description ?? null,
    thumbnailUrl: body.thumbnailUrl ?? null,
    subscriberCount: null,
    videoCount: null,
    indexingStatus: 'pending',
    indexingProgress: {
      phase: 'pending',
      imported: 0,
      analyzed: 0,
      total: 0,
    },
    createdAt: now,
    updatedAt: now,
  }

  await saveChannel(channel)
  return NextResponse.json({ channel })
}
