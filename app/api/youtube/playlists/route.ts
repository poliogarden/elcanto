import { NextResponse } from 'next/server'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { fetchUserPlaylists } from '@/lib/youtube/oauth-client'
import { getYouTubeOAuthAccessToken } from '@/lib/youtube/oauth-access'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json(
      { error: 'Sign in and connect YouTube to browse playlists.', requiresAuth: true },
      { status: 401 },
    )
  }

  const accessToken = await getYouTubeOAuthAccessToken()
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Connect YouTube to browse playlists.', requiresYouTube: true },
      { status: 403 },
    )
  }

  try {
    const playlists = await fetchUserPlaylists(accessToken)
    return NextResponse.json({ playlists })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load playlists.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
