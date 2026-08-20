import { createClient } from '@supabase/supabase-js'
import type { ImportedPlaylist, PersonalSignal, PersonalSignalSource } from '@/lib/types/personal'
import * as localStore from '@/lib/personal/local-store'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function upsertPersonalSignals(
  userId: string,
  signals: Array<{
    source: PersonalSignalSource
    youtubeId?: string
    title: string
    channel?: string
    signalAt: string
    topics?: string[]
    concepts?: string[]
    metadata?: Record<string, unknown>
  }>,
  options?: { useSupabase?: boolean },
): Promise<number> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    return localStore.localUpsertPersonalSignals(userId, signals)
  }

  const supabase = getSupabase()
  if (!supabase || signals.length === 0) {
    return localStore.localUpsertPersonalSignals(userId, signals)
  }

  const rows = signals.map((s) => ({
    user_id: userId,
    source: s.source,
    youtube_id: s.youtubeId ?? null,
    title: s.title,
    channel: s.channel ?? null,
    signal_at: s.signalAt,
    topics: s.topics ?? [],
    concepts: s.concepts ?? [],
    metadata: s.metadata ?? {},
  }))

  const { error } = await supabase.from('personal_signals').upsert(rows, {
    onConflict: 'user_id,source,youtube_id',
  })

  if (error) throw new Error(error.message)
  return rows.length
}

export async function getPersonalSignals(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<PersonalSignal[]> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    return localStore.localGetPersonalSignals(userId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localGetPersonalSignals(userId)

  const { data } = await supabase
    .from('personal_signals')
    .select('*')
    .eq('user_id', userId)
    .order('signal_at', { ascending: false })
    .limit(500)

  return (data ?? []).map((row) => ({
    id: row.id,
    source: row.source as PersonalSignalSource,
    youtubeId: row.youtube_id ?? undefined,
    title: row.title,
    channel: row.channel ?? undefined,
    signalAt: row.signal_at,
    topics: row.topics ?? [],
    concepts: row.concepts ?? [],
  }))
}

export async function deleteYouTubeSignals(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    await localStore.localDeleteYouTubeSignals(userId)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localDeleteYouTubeSignals(userId)
    return
  }

  await supabase
    .from('personal_signals')
    .delete()
    .eq('user_id', userId)
    .in('source', ['youtube_subscription', 'youtube_like', 'youtube_playlist'])
}

export async function savePersonalProfile(
  userId: string,
  profile: unknown,
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    await localStore.localSavePersonalProfile(userId, profile)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localSavePersonalProfile(userId, profile)
    return
  }

  await supabase.from('personal_profiles').upsert({
    user_id: userId,
    profile,
    computed_at: new Date().toISOString(),
  })
}

export async function getCachedPersonalProfile(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<unknown | null> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    return localStore.localGetCachedPersonalProfile(userId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localGetCachedPersonalProfile(userId)

  const { data } = await supabase
    .from('personal_profiles')
    .select('profile, computed_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null

  const age = Date.now() - new Date(data.computed_at).getTime()
  if (age > 1000 * 60 * 60 * 6) return null // 6h cache
  return data.profile
}

export async function getYouTubeConnection(
  userId: string,
  options?: { useSupabase?: boolean },
) {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    return localStore.localGetYouTubeConnection(userId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localGetYouTubeConnection(userId)

  const { data } = await supabase
    .from('youtube_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return data
}

export async function saveYouTubeConnection(
  userId: string,
  connection: {
    accessToken: string
    refreshToken?: string | null
    expiresAt?: string | null
    scopes?: string[]
  },
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  const existing = await getYouTubeConnection(userId, options)
  const mergedScopes = [
    ...new Set([...(existing?.scopes as string[] | undefined ?? []), ...(connection.scopes ?? [])]),
  ]

  const payload = {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken ?? (existing?.refresh_token as string | null) ?? null,
    expiresAt: connection.expiresAt ?? (existing?.expires_at as string | null) ?? null,
    scopes: mergedScopes,
  }

  if (!useSupabase) {
    await localStore.localSaveYouTubeConnection(userId, payload)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localSaveYouTubeConnection(userId, payload)
    return
  }

  await supabase.from('youtube_connections').upsert({
    user_id: userId,
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
    expires_at: payload.expiresAt,
    scopes: payload.scopes,
    connected_at: existing?.connected_at ?? new Date().toISOString(),
  })
}

export async function deleteYouTubeConnection(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    await localStore.localDeleteYouTubeConnection(userId)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localDeleteYouTubeConnection(userId)
    return
  }

  await supabase.from('youtube_connections').delete().eq('user_id', userId)
  await deleteYouTubeSignals(userId)
  await supabase.from('personal_profiles').delete().eq('user_id', userId)
}

export async function markYouTubeSynced(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    await localStore.localMarkYouTubeSynced(userId)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localMarkYouTubeSynced(userId)
    return
  }

  await supabase
    .from('youtube_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)
}

export async function listStaleYouTubeConnections(limit: number): Promise<string[]> {
  const supabase = getSupabase()
  if (!supabase) return localStore.localListStaleYouTubeConnections(limit)

  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('youtube_connections')
    .select('user_id, last_synced_at')
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .limit(limit)

  return (data ?? []).map((row) => row.user_id as string)
}

export async function saveImportedPlaylist(
  userId: string,
  playlist: { playlistId: string; title: string; videoCount: number },
  options?: { useSupabase?: boolean },
): Promise<void> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    await localStore.localSaveImportedPlaylist(userId, playlist)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    await localStore.localSaveImportedPlaylist(userId, playlist)
    return
  }

  await supabase.from('youtube_playlist_imports').upsert({
    user_id: userId,
    playlist_id: playlist.playlistId,
    playlist_title: playlist.title,
    video_count: playlist.videoCount,
    imported_at: new Date().toISOString(),
  })
}

export async function getImportedPlaylists(
  userId: string,
  options?: { useSupabase?: boolean },
): Promise<ImportedPlaylist[]> {
  const useSupabase = options?.useSupabase ?? (await resolvePersonalUser()).useSupabase
  if (!useSupabase) {
    return localStore.localGetImportedPlaylists(userId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localGetImportedPlaylists(userId)

  const { data } = await supabase
    .from('youtube_playlist_imports')
    .select('*')
    .eq('user_id', userId)
    .order('imported_at', { ascending: false })

  return (data ?? []).map((row) => ({
    playlistId: row.playlist_id,
    title: row.playlist_title ?? row.playlist_id,
    videoCount: row.video_count ?? 0,
    importedAt: row.imported_at,
  }))
}

export async function deleteImportedPlaylist(userId: string, playlistId: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  await supabase
    .from('personal_signals')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'youtube_playlist')
    .contains('metadata', { playlistId })

  await supabase
    .from('youtube_playlist_imports')
    .delete()
    .eq('user_id', userId)
    .eq('playlist_id', playlistId)
}
