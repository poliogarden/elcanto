import { NextResponse } from 'next/server'
import { refreshPersonalProfile } from '@/lib/personal/background-sync'
import { importYouTubePlaylist } from '@/lib/personal/playlist-import'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

export async function POST(request: Request) {
  const ctx = await resolvePersonalUser()
  const storage = { useSupabase: ctx.useSupabase }

  if (ctx.isAnonymous) {
    return NextResponse.json(
      { error: 'Playlist import requires Google sign-in with YouTube access.' },
      { status: 400 },
    )
  }

  const body = (await request.json()) as { playlistUrl?: string }
  if (!body.playlistUrl?.trim()) {
    return NextResponse.json({ error: 'Playlist URL or ID required.' }, { status: 400 })
  }

  try {
    const result = await importYouTubePlaylist(ctx.userId, body.playlistUrl, storage)
    const profile = await refreshPersonalProfile(ctx.userId, storage)
    return NextResponse.json({ ...result, profile })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Playlist import failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
