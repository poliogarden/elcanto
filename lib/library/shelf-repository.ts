import { createClient } from '@supabase/supabase-js'
import type { LibraryItem } from '@/lib/types/library'
import type { Shelf, ShelfWithPreview } from '@/lib/types/shelf'
import * as localStore from '@/lib/library/local-shelf-store'
import { listLibraryItems } from '@/lib/library/library-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function rowToShelf(row: Record<string, unknown>, userId: string): Shelf {
  return {
    id: String(row.id),
    userId,
    name: String(row.name),
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

async function useLocal(userId: string): Promise<boolean> {
  const ctx = await resolvePersonalUser()
  return !ctx.useSupabase || ctx.userId !== userId || !getSupabase()
}

export async function listShelves(userId: string): Promise<ShelfWithPreview[]> {
  if (await useLocal(userId)) return localStore.localListShelves(userId)

  const supabase = getSupabase()!
  const library = await listLibraryItems(userId)
  const byId = new Map(library.map((i) => [i.id, i]))

  const { data: shelves } = await supabase
    .from('shelves')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order')

  const { data: links } = await supabase
    .from('shelf_items')
    .select('shelf_id, library_item_id')
    .in('shelf_id', (shelves ?? []).map((s) => s.id))

  const byShelf = new Map<string, string[]>()
  for (const link of links ?? []) {
    const arr = byShelf.get(link.shelf_id) ?? []
    arr.push(link.library_item_id)
    byShelf.set(link.shelf_id, arr)
  }

  return (shelves ?? []).map((row) => {
    const shelf = rowToShelf(row, userId)
    const itemIds = byShelf.get(shelf.id) ?? []
    const thumbs = itemIds
      .map((id) => byId.get(id)?.thumbnailUrl)
      .filter((t): t is string => Boolean(t))
      .slice(0, 4)
    return { ...shelf, videoCount: itemIds.length, previewThumbnails: thumbs }
  })
}

export async function createShelf(userId: string, name: string): Promise<Shelf> {
  if (await useLocal(userId)) return localStore.localCreateShelf(userId, name)

  const supabase = getSupabase()!
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('shelves')
    .insert({ user_id: userId, name: name.trim(), sort_order: 0, updated_at: now })
    .select('*')
    .single()

  if (error) return localStore.localCreateShelf(userId, name)
  return rowToShelf(data, userId)
}

export async function renameShelf(userId: string, shelfId: string, name: string): Promise<Shelf | null> {
  if (await useLocal(userId)) return localStore.localRenameShelf(userId, shelfId, name)

  const supabase = getSupabase()!
  const { data, error } = await supabase
    .from('shelves')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', shelfId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) return localStore.localRenameShelf(userId, shelfId, name)
  return rowToShelf(data, userId)
}

export async function deleteShelf(userId: string, shelfId: string): Promise<boolean> {
  if (await useLocal(userId)) return localStore.localDeleteShelf(userId, shelfId)

  const supabase = getSupabase()!
  const { error } = await supabase.from('shelves').delete().eq('id', shelfId).eq('user_id', userId)
  if (error) return localStore.localDeleteShelf(userId, shelfId)
  return true
}

export async function addVideoToShelf(
  userId: string,
  shelfId: string,
  youtubeId: string,
): Promise<boolean> {
  const library = await listLibraryItems(userId)
  const item = library.find((i) => i.youtubeId === youtubeId)
  if (!item) return false

  if (await useLocal(userId)) return localStore.localAddToShelf(userId, shelfId, youtubeId)

  const supabase = getSupabase()!
  const { error } = await supabase.from('shelf_items').upsert({
    shelf_id: shelfId,
    library_item_id: item.id,
    sort_order: 0,
  })
  if (error) return localStore.localAddToShelf(userId, shelfId, youtubeId)
  return true
}

export async function removeVideoFromShelf(
  userId: string,
  shelfId: string,
  youtubeId: string,
): Promise<boolean> {
  if (await useLocal(userId)) return localStore.localRemoveFromShelf(userId, shelfId, youtubeId)

  const library = await listLibraryItems(userId)
  const item = library.find((i) => i.youtubeId === youtubeId)
  if (!item) return false

  const supabase = getSupabase()!
  const { error } = await supabase
    .from('shelf_items')
    .delete()
    .eq('shelf_id', shelfId)
    .eq('library_item_id', item.id)

  if (error) return localStore.localRemoveFromShelf(userId, shelfId, youtubeId)
  return true
}

export async function getShelfItems(userId: string, shelfId: string): Promise<LibraryItem[]> {
  if (await useLocal(userId)) return localStore.localGetShelfItems(userId, shelfId)

  const supabase = getSupabase()!
  const { data: links } = await supabase
    .from('shelf_items')
    .select('library_item_id')
    .eq('shelf_id', shelfId)

  const ids = new Set((links ?? []).map((l) => l.library_item_id))
  const library = await listLibraryItems(userId)
  return library.filter((i) => ids.has(i.id))
}

export async function listUnfiledItems(userId: string): Promise<LibraryItem[]> {
  if (await useLocal(userId)) return localStore.localListUnfiled(userId)

  const library = await listLibraryItems(userId)
  const supabase = getSupabase()!
  const { data: links } = await supabase.from('shelf_items').select('library_item_id')
  const filed = new Set((links ?? []).map((l) => l.library_item_id))
  return library.filter((i) => !filed.has(i.id))
}
