import { NextResponse } from 'next/server'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { fetchSubscriptions } from '@/lib/youtube/oauth-client'
import { getYouTubeOAuthAccessToken } from '@/lib/youtube/oauth-access'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json(
      { error: 'Sign in and connect YouTube to browse subscriptions.', requiresAuth: true },
      { status: 401 },
    )
  }

  const accessToken = await getYouTubeOAuthAccessToken()
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Connect YouTube to browse subscriptions.', requiresYouTube: true },
      { status: 403 },
    )
  }

  try {
    const channels = await fetchSubscriptions(accessToken)
    return NextResponse.json({
      channels: channels.map((c) => ({
        channelId: c.channelId,
        title: c.title,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load subscriptions.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
