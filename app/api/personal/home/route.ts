import { NextResponse } from 'next/server'
import { buildHomeSummary } from '@/lib/personal/home-summary'
import { triggerBackgroundSyncIfNeeded } from '@/lib/personal/background-sync'
import { buildPersonalProfileFromSignals } from '@/lib/personal/personal-insights'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import {
  getCachedPersonalProfile,
  getImportedPlaylists,
  getPersonalSignals,
  getYouTubeConnection,
  savePersonalProfile,
} from '@/lib/personal/signals-repository'
import type { PersonalProfile } from '@/lib/types/personal'

export async function GET() {
  const ctx = await resolvePersonalUser()
  const storage = { useSupabase: ctx.useSupabase }

  if (!ctx.isAnonymous) {
    triggerBackgroundSyncIfNeeded(ctx.userId, storage)
  }

  let profile = (await getCachedPersonalProfile(ctx.userId, storage)) as PersonalProfile | null

  if (!profile) {
    const signals = await getPersonalSignals(ctx.userId, storage)
    const connection = await getYouTubeConnection(ctx.userId, storage)
    const importedPlaylists = await getImportedPlaylists(ctx.userId, storage)

    profile = await buildPersonalProfileFromSignals(
      ctx.userId,
      signals,
      !!connection,
      (connection?.last_synced_at as string) ?? null,
      importedPlaylists,
    )

    await savePersonalProfile(ctx.userId, profile, storage)
  }

  return NextResponse.json({ summary: buildHomeSummary(profile), isAnonymous: ctx.isAnonymous })
}
