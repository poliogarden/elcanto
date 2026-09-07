import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { getChannelForUser } from '@/lib/creator/repository'
import { startChannelIndex } from '@/lib/creator/indexing/channel-index-runner'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const userId = await resolveCreatorUserId()
  const channel = await getChannelForUser(id, userId)
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (channel.isSample) {
    return NextResponse.json({
      message: 'Sample channel is pre-indexed',
      channel,
    })
  }

  const job = await startChannelIndex(id)
  return NextResponse.json({ job, channel })
}
