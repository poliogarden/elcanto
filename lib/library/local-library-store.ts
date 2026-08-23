import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { LibraryItem } from '@/lib/types/library'

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

function libraryPath(userId: string): string {
  return path.join(userDir(userId), 'library.json')
}

export async function localListLibraryItems(userId: string): Promise<LibraryItem[]> {
  const items = await readJson<LibraryItem[]>(libraryPath(userId), [])
  return items.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function localSaveLibraryItem(
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
  const dir = await ensureUserDir(userId)
  const filePath = path.join(dir, 'library.json')
  const existing = await readJson<LibraryItem[]>(filePath, [])
  const now = new Date().toISOString()
  const found = existing.find((i) => i.youtubeId === input.youtubeId)

  if (found) {
    const updated: LibraryItem = {
      ...found,
      title: input.title,
      channelName: input.channelName ?? found.channelName,
      thumbnailUrl: input.thumbnailUrl ?? found.thumbnailUrl,
      duration: input.duration ?? found.duration,
      durationSeconds: input.durationSeconds ?? found.durationSeconds,
      sourceUrl: input.sourceUrl ?? found.sourceUrl,
      metadata: { ...found.metadata, ...input.metadata },
      updatedAt: now,
    }
    const next = existing.map((i) => (i.youtubeId === input.youtubeId ? updated : i))
    await writeJson(filePath, next)
    return updated
  }

  const item: LibraryItem = {
    id: randomUUID(),
    userId,
    youtubeId: input.youtubeId,
    sourceUrl: input.sourceUrl,
    title: input.title,
    channelName: input.channelName,
    thumbnailUrl: input.thumbnailUrl,
    duration: input.duration,
    durationSeconds: input.durationSeconds,
    metadata: input.metadata ?? {},
    savedAt: now,
    updatedAt: now,
  }
  await writeJson(filePath, [...existing, item])
  return item
}

export async function localRemoveLibraryItem(userId: string, youtubeId: string): Promise<boolean> {
  const filePath = libraryPath(userId)
  const existing = await readJson<LibraryItem[]>(filePath, [])
  const next = existing.filter((i) => i.youtubeId !== youtubeId)
  if (next.length === existing.length) return false
  await writeJson(filePath, next)
  return true
}
