import { NextResponse } from 'next/server'
import { searchYouTubeVideos } from '@/lib/youtube/search-videos'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const pageToken = searchParams.get('pageToken') ?? undefined

  if (q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 })
  }

  try {
    const result = await searchYouTubeVideos(q, { pageToken })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
