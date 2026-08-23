import { createClient } from '@supabase/supabase-js'
import type { LibraryItem } from '@/lib/types/library'
import * as localStore from '@/lib/library/local-library-store'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function rowToItem(row: Record<string, unknown>, userId: string): LibraryItem {
  return {
    id: String(row.id),
    userId,
    youtubeId: String(row.youtube_id),
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    title: String(row.title),
    channelName: row.channel_name ? String(row.channel_name) : undefined,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
    duration: row.duration ? String(row.duration) : undefined,
    durationSeconds:
      typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
    savedAt: String(row.saved_at),
    updatedAt: String(row.updated_at),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export async function listLibraryItems(userId: string): Promise<LibraryItem[]> {
  const ctx = await resolvePersonalUser()
  if (!ctx.useSupabase || ctx.userId !== userId) {
    return localStore.localListLibraryItems(userId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localListLibraryItems(userId)

  const { data, error } = await supabase
    .from('library_items')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (error) {
    return localStore.localListLibraryItems(userId)
  }

  return (data ?? []).map((row) => rowToItem(row, userId))
}

export async function saveLibraryItem(
  userId: string,
  input: {
    youtubeId: string
    sourceUrl?: string
    title: string
    channelName?: string
    thumbnailUrl?: string
    duration?: string
    durationSeconds?: number
    metadata?: Record<string, unknown>
  },
): Promise<LibraryItem> {
  const ctx = await resolvePersonalUser()
  const now = new Date().toISOString()

  if (!ctx.useSupabase) {
    return localStore.localSaveLibraryItem(userId, input)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localSaveLibraryItem(userId, input)

  const { data, error } = await supabase
    .from('library_items')
    .upsert(
      {
        user_id: userId,
        youtube_id: input.youtubeId,
        source_url: input.sourceUrl ?? null,
        title: input.title,
        channel_name: input.channelName ?? null,
        thumbnail_url: input.thumbnailUrl ?? null,
        duration: input.duration ?? null,
        duration_seconds: input.durationSeconds ?? null,
        metadata: input.metadata ?? {},
        updated_at: now,
      },
      { onConflict: 'user_id,youtube_id' },
    )
    .select('*')
    .single()

  if (error) {
    return localStore.localSaveLibraryItem(userId, input)
  }

  return rowToItem(data, userId)
}

export async function removeLibraryItem(userId: string, youtubeId: string): Promise<boolean> {
  const ctx = await resolvePersonalUser()

  if (!ctx.useSupabase) {
    return localStore.localRemoveLibraryItem(userId, youtubeId)
  }

  const supabase = getSupabase()
  if (!supabase) return localStore.localRemoveLibraryItem(userId, youtubeId)

  const { error } = await supabase
    .from('library_items')
    .delete()
    .eq('user_id', userId)
    .eq('youtube_id', youtubeId)

  if (error) {
    return localStore.localRemoveLibraryItem(userId, youtubeId)
  }

  await localStore.localRemoveLibraryItem(userId, youtubeId)
  return true
}
