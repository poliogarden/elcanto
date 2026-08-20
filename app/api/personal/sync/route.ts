import { NextResponse } from 'next/server'
import { refreshPersonalProfile } from '@/lib/personal/background-sync'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { getYouTubeConnection } from '@/lib/personal/signals-repository'
import { syncYouTubeSignals } from '@/lib/personal/youtube-sync'

export async function POST() {
  const ctx = await resolvePersonalUser()
  const storage = { useSupabase: ctx.useSupabase }

  if (ctx.isAnonymous) {
    return NextResponse.json(
      { error: 'YouTube sync requires Google sign-in. Use synthesis to build your local taste profile.' },
      { status: 400 },
    )
  }

  try {
    const syncResult = await syncYouTubeSignals(ctx.userId, storage)
    const profile = await refreshPersonalProfile(ctx.userId, storage)
    const connection = await getYouTubeConnection(ctx.userId, storage)

    return NextResponse.json({
      synced: syncResult,
      profile,
      lastSyncedAt: (connection?.last_synced_at as string) ?? new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
