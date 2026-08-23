import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { LibraryItem } from '@/lib/types/library'
import type { Shelf, ShelfWithPreview } from '@/lib/types/shelf'
import { localListLibraryItems } from '@/lib/library/local-library-store'

const DATA_ROOT = path.join(process.cwd(), '.data', 'personal')

function userDir(userId: string): string {
  return path.join(DATA_ROOT, userId.replace(/[^a-zA-Z0-9_-]/g, '_'))
}

async function ensureUserDir(userId: string): Promise<string> {
  const dir = userDir(userId)
  await mkdir(dir, { recursive: true })
  return dir
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

type ShelfStore = {
  shelves: Shelf[]
  /** shelfId → youtubeId[] */
  items: Record<string, string[]>
}

async function loadStore(userId: string): Promise<ShelfStore> {
  const filePath = path.join(userDir(userId), 'shelves.json')
  return readJson<ShelfStore>(filePath, { shelves: [], items: {} })
}

async function saveStore(userId: string, store: ShelfStore): Promise<void> {
  await ensureUserDir(userId)
  const filePath = path.join(userDir(userId), 'shelves.json')
  await writeJson(filePath, store)
}

export async function localListShelves(userId: string): Promise<ShelfWithPreview[]> {
  const store = await loadStore(userId)
  const library = await localListLibraryItems(userId)
  const byYoutube = new Map(library.map((i) => [i.youtubeId, i]))

  return store.shelves
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((shelf) => {
      const ids = store.items[shelf.id] ?? []
      const thumbs = ids
        .map((id) => byYoutube.get(id)?.thumbnailUrl)
        .filter((t): t is string => Boolean(t))
        .slice(0, 4)
      return {
        ...shelf,
        videoCount: ids.length,
        previewThumbnails: thumbs,
      }
    })
}

export async function localCreateShelf(userId: string, name: string): Promise<Shelf> {
  const store = await loadStore(userId)
  const now = new Date().toISOString()
  const shelf: Shelf = {
    id: randomUUID(),
    userId,
    name: name.trim(),
    sortOrder: store.shelves.length,
    createdAt: now,
    updatedAt: now,
  }
  store.shelves.push(shelf)
  store.items[shelf.id] = []
  await saveStore(userId, store)
  return shelf
}

export async function localRenameShelf(userId: string, shelfId: string, name: string): Promise<Shelf | null> {
  const store = await loadStore(userId)
  const idx = store.shelves.findIndex((s) => s.id === shelfId)
  if (idx < 0) return null
  const updated = {
    ...store.shelves[idx],
    name: name.trim(),
    updatedAt: new Date().toISOString(),
  }
  store.shelves[idx] = updated
  await saveStore(userId, store)
  return updated
}

export async function localDeleteShelf(userId: string, shelfId: string): Promise<boolean> {
  const store = await loadStore(userId)
  const before = store.shelves.length
  store.shelves = store.shelves.filter((s) => s.id !== shelfId)
  delete store.items[shelfId]
  if (store.shelves.length === before) return false
  await saveStore(userId, store)
  return true
}

export async function localAddToShelf(
  userId: string,
  shelfId: string,
  youtubeId: string,
): Promise<boolean> {
  const store = await loadStore(userId)
  if (!store.shelves.some((s) => s.id === shelfId)) return false
  const list = store.items[shelfId] ?? []
  if (list.includes(youtubeId)) return true
  store.items[shelfId] = [...list, youtubeId]
  await saveStore(userId, store)
  return true
}

export async function localRemoveFromShelf(
  userId: string,
  shelfId: string,
  youtubeId: string,
): Promise<boolean> {
  const store = await loadStore(userId)
  const list = store.items[shelfId]
  if (!list) return false
  const next = list.filter((id) => id !== youtubeId)
  if (next.length === list.length) return false
  store.items[shelfId] = next
  await saveStore(userId, store)
  return true
}

export async function localGetShelfItems(userId: string, shelfId: string): Promise<LibraryItem[]> {
  const store = await loadStore(userId)
  const ids = new Set(store.items[shelfId] ?? [])
  const library = await localListLibraryItems(userId)
  return library.filter((i) => ids.has(i.youtubeId))
}

export async function localListUnfiled(userId: string): Promise<LibraryItem[]> {
  const store = await loadStore(userId)
  const filed = new Set(Object.values(store.items).flat())
  const library = await localListLibraryItems(userId)
  return library.filter((i) => !filed.has(i.youtubeId))
}

export async function localGetShelfYoutubeIds(userId: string): Promise<Set<string>> {
  const store = await loadStore(userId)
  return new Set(Object.values(store.items).flat())
}
