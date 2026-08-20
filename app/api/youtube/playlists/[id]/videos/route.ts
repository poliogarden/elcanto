import { NextResponse } from 'next/server'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import { fetchPlaylistTitle, fetchPlaylistVideos } from '@/lib/youtube/oauth-client'
import { getYouTubeOAuthAccessToken } from '@/lib/youtube/oauth-access'
import { parsePlaylistId } from '@/lib/youtube/playlist-url'

type RouteContext = { params: Promise<{ id: string }> }

async function loadPlaylistVideos(playlistId: string, accessToken: string | null) {
  if (accessToken) {
    const [title, videos] = await Promise.all([
      fetchPlaylistTitle(accessToken, playlistId),
      fetchPlaylistVideos(accessToken, playlistId, 50),
    ])
    const items = await enrichVideoItems(
      videos.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channel,
        publishedAt: v.publishedAt,
        sourceType: 'playlist' as const,
      })),
    )
    return { title, items, count: items.length }
  }

  throw new Error('Connect YouTube to load playlist videos.')
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const playlistId = parsePlaylistId(id) ?? id

  const ctx = await resolvePersonalUser()
  const accessToken = ctx.isAnonymous ? null : await getYouTubeOAuthAccessToken()

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Connect YouTube to load playlist videos.', requiresYouTube: true },
      { status: 403 },
    )
  }

  try {
    const result = await loadPlaylistVideos(playlistId, accessToken)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load playlist.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
