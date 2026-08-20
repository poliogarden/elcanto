import {
  fetchPlaylistTitle,
  fetchPlaylistVideos,
  refreshAccessToken,
} from '@/lib/youtube/oauth-client'
import { parsePlaylistId } from '@/lib/youtube/playlist-url'
import { extractTopicsFromText } from '@/lib/personal/taste-engine'
import { PLAYLIST_MAX_VIDEOS } from '@/lib/personal/sync-policy'
import {
  getYouTubeConnection,
  saveImportedPlaylist,
  saveYouTubeConnection,
  upsertPersonalSignals,
} from '@/lib/personal/signals-repository'

export async function importYouTubePlaylist(
  userId: string,
  playlistInput: string,
  storage: { useSupabase?: boolean } = {},
): Promise<{ playlistId: string; title: string; imported: number }> {
  const playlistId = parsePlaylistId(playlistInput)
  if (!playlistId) {
    throw new Error('Invalid playlist URL or ID.')
  }

  const connection = await getYouTubeConnection(userId, storage)
  if (!connection) {
    throw new Error('YouTube not connected. Connect your account first.')
  }

  let accessToken = connection.access_token as string
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0

  if (expiresAt && Date.now() > expiresAt - 60000 && connection.refresh_token) {
    const refreshed = await refreshAccessToken(connection.refresh_token as string)
    accessToken = refreshed.access_token
    await saveYouTubeConnection(userId, {
      accessToken,
      refreshToken: connection.refresh_token as string,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      scopes: connection.scopes as string[],
    }, storage)
  }

  const [title, videos] = await Promise.all([
    fetchPlaylistTitle(accessToken, playlistId),
    fetchPlaylistVideos(accessToken, playlistId, PLAYLIST_MAX_VIDEOS),
  ])

  if (videos.length === 0) {
    throw new Error('Playlist is empty or not accessible.')
  }

  const signals = videos.map((v) => ({
    source: 'youtube_playlist' as const,
    youtubeId: v.videoId,
    title: v.title,
    channel: v.channel,
    signalAt: v.publishedAt,
    topics: extractTopicsFromText(`${v.title} ${v.channel}`),
    metadata: { playlistId, playlistTitle: title },
  }))

  await upsertPersonalSignals(userId, signals, storage)
  await saveImportedPlaylist(userId, {
    playlistId,
    title,
    videoCount: signals.length,
  }, storage)

  return { playlistId, title, imported: signals.length }
}
