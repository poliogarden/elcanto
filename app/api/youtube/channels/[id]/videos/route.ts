import { NextResponse } from 'next/server'
import { fetchChannelRecentVideos } from '@/lib/youtube/channel-videos'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params

  try {
    const partial = await fetchChannelRecentVideos(id)
    const items = await enrichVideoItems(partial)
    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load channel videos.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
