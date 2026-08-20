import { NextResponse } from 'next/server'
import { parsePasteInput } from '@/lib/youtube/parse-paste-input'
import { fetchPlaylistTitle, fetchPlaylistVideos } from '@/lib/youtube/oauth-client'
import { getYouTubeOAuthAccessToken } from '@/lib/youtube/oauth-access'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string }
    const input = body.url?.trim()
    if (!input) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
    }

    const parsed = parsePasteInput(input)
    if (parsed.kind !== 'playlist') {
      return NextResponse.json({ error: 'Not a playlist URL.' }, { status: 400 })
    }

    const ctx = await resolvePersonalUser()
    const accessToken = ctx.isAnonymous ? null : await getYouTubeOAuthAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        {
          playlistId: parsed.playlistId,
          error: 'Connect YouTube to load playlist videos.',
          requiresYouTube: true,
        },
        { status: 403 },
      )
    }

    const [title, videos] = await Promise.all([
      fetchPlaylistTitle(accessToken, parsed.playlistId),
      fetchPlaylistVideos(accessToken, parsed.playlistId, 50),
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

    return NextResponse.json({
      playlistId: parsed.playlistId,
      title,
      count: items.length,
      items,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Playlist detection failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
