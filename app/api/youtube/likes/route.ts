import { NextResponse } from 'next/server'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import { fetchLikedVideos } from '@/lib/youtube/oauth-client'
import { getYouTubeOAuthAccessToken } from '@/lib/youtube/oauth-access'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json(
      { error: 'Sign in and connect YouTube to browse liked videos.', requiresAuth: true },
      { status: 401 },
    )
  }

  const accessToken = await getYouTubeOAuthAccessToken()
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Connect YouTube to browse liked videos.', requiresYouTube: true },
      { status: 403 },
    )
  }

  try {
    const liked = await fetchLikedVideos(accessToken)
    const items = await enrichVideoItems(
      liked.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channel,
        publishedAt: v.publishedAt,
        sourceType: 'liked' as const,
      })),
    )
    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load liked videos.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
