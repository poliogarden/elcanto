import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { ImportedPlaylist, PersonalSignal, PersonalSignalSource } from '@/lib/types/personal'

const DATA_ROOT = path.join(process.cwd(), '.data', 'personal')

type SignalInput = {
  source: PersonalSignalSource
  youtubeId?: string
  title: string
  channel?: string
  signalAt: string
  topics?: string[]
  concepts?: string[]
  metadata?: Record<string, unknown>
}

type YouTubeConnection = {
  access_token: string
  refresh_token?: string | null
  expires_at?: string | null
  scopes?: string[]
  last_synced_at?: string | null
  connected_at?: string
}

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

function signalKey(source: PersonalSignalSource, youtubeId?: string): string {
  return `${source}::${youtubeId ?? ''}`
}

export async function localUpsertPersonalSignals(userId: string, signals: SignalInput[]): Promise<number> {
  if (signals.length === 0) return 0

  const dir = await ensureUserDir(userId)
  const filePath = path.join(dir, 'signals.json')
  const existing = await readJson<PersonalSignal[]>(filePath, [])
  const byKey = new Map(existing.map((s) => [signalKey(s.source, s.youtubeId), s]))

  for (const input of signals) {
    const key = signalKey(input.source, input.youtubeId)
    const prev = byKey.get(key)
    byKey.set(key, {
      id: prev?.id ?? randomUUID(),
      source: input.source,
      youtubeId: input.youtubeId,
      title: input.title,
      channel: input.channel,
      signalAt: input.signalAt,
      topics: input.topics ?? [],
      concepts: input.concepts ?? [],
    })
  }

  const merged = [...byKey.values()].sort(
    (a, b) => new Date(b.signalAt).getTime() - new Date(a.signalAt).getTime(),
  )
  await writeJson(filePath, merged.slice(0, 500))
  return signals.length
}

export async function localGetPersonalSignals(userId: string): Promise<PersonalSignal[]> {
  const filePath = path.join(userDir(userId), 'signals.json')
  return readJson<PersonalSignal[]>(filePath, [])
}

export async function localDeleteYouTubeSignals(userId: string): Promise<void> {
  const filePath = path.join(userDir(userId), 'signals.json')
  const existing = await readJson<PersonalSignal[]>(filePath, [])
  const kept = existing.filter(
    (s) => !['youtube_subscription', 'youtube_like', 'youtube_playlist'].includes(s.source),
  )
  await writeJson(filePath, kept)
}

export async function localSavePersonalProfile(userId: string, profile: unknown): Promise<void> {
  const dir = await ensureUserDir(userId)
  await writeJson(path.join(dir, 'profile.json'), {
    profile,
    computed_at: new Date().toISOString(),
  })
}

export async function localGetCachedPersonalProfile(userId: string): Promise<unknown | null> {
  const filePath = path.join(userDir(userId), 'profile.json')
  const data = await readJson<{ profile: unknown; computed_at: string } | null>(filePath, null)
  if (!data) return null

  const age = Date.now() - new Date(data.computed_at).getTime()
  if (age > 1000 * 60 * 60 * 6) return null
  return data.profile
}

export async function localGetYouTubeConnection(userId: string): Promise<YouTubeConnection | null> {
  const filePath = path.join(userDir(userId), 'youtube.json')
  return readJson<YouTubeConnection | null>(filePath, null)
}

export async function localSaveYouTubeConnection(
  userId: string,
  connection: {
    accessToken: string
    refreshToken?: string | null
    expiresAt?: string | null
    scopes?: string[]
  },
): Promise<void> {
  const dir = await ensureUserDir(userId)
  const existing = await localGetYouTubeConnection(userId)
  await writeJson(path.join(dir, 'youtube.json'), {
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken ?? existing?.refresh_token ?? null,
    expires_at: connection.expiresAt ?? null,
    scopes: connection.scopes ?? existing?.scopes ?? [],
    last_synced_at: existing?.last_synced_at ?? null,
    connected_at: existing?.connected_at ?? new Date().toISOString(),
  })
}

export async function localDeleteYouTubeConnection(userId: string): Promise<void> {
  await localDeleteYouTubeSignals(userId)
  const dir = userDir(userId)
  await writeJson(path.join(dir, 'youtube.json'), null).catch(() => {})
  await writeJson(path.join(dir, 'profile.json'), null).catch(() => {})
}

export async function localMarkYouTubeSynced(userId: string): Promise<void> {
  const connection = await localGetYouTubeConnection(userId)
  if (!connection) return
  const dir = await ensureUserDir(userId)
  await writeJson(path.join(dir, 'youtube.json'), {
    ...connection,
    last_synced_at: new Date().toISOString(),
  })
}

export async function localListStaleYouTubeConnections(limit: number): Promise<string[]> {
  // File store: scan all user dirs — skip for local dev cron
  void limit
  return []
}

export async function localSaveImportedPlaylist(
  userId: string,
  playlist: { playlistId: string; title: string; videoCount: number },
): Promise<void> {
  const dir = await ensureUserDir(userId)
  const filePath = path.join(dir, 'playlists.json')
  const existing = await readJson<ImportedPlaylist[]>(filePath, [])
  const filtered = existing.filter((p) => p.playlistId !== playlist.playlistId)
  filtered.unshift({
    playlistId: playlist.playlistId,
    title: playlist.title,
    videoCount: playlist.videoCount,
    importedAt: new Date().toISOString(),
  })
  await writeJson(filePath, filtered)
}

export async function localGetImportedPlaylists(userId: string): Promise<ImportedPlaylist[]> {
  const filePath = path.join(userDir(userId), 'playlists.json')
  return readJson<ImportedPlaylist[]>(filePath, [])
}

export async function localDeletePersonalProfile(userId: string): Promise<void> {
  const filePath = path.join(userDir(userId), 'profile.json')
  await writeJson(filePath, null).catch(() => {})
}
