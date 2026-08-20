import {
  fetchLikedVideos,
  fetchSubscriptions,
  refreshAccessToken,
} from '@/lib/youtube/oauth-client'
import { extractTopicsFromText } from '@/lib/personal/taste-engine'
import {
  getYouTubeConnection,
  markYouTubeSynced,
  saveYouTubeConnection,
  upsertPersonalSignals,
} from '@/lib/personal/signals-repository'

type StorageOptions = { useSupabase?: boolean }

export async function syncYouTubeSignals(
  userId: string,
  storage: StorageOptions = {},
): Promise<{
  subscriptions: number
  likes: number
}> {
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

  const [subscriptions, likes] = await Promise.all([
    fetchSubscriptions(accessToken),
    fetchLikedVideos(accessToken),
  ])

  const subSignals = subscriptions.map((s) => ({
    source: 'youtube_subscription' as const,
    youtubeId: s.channelId,
    title: s.title,
    channel: s.title,
    signalAt: s.subscribedAt,
    topics: extractTopicsFromText(s.title),
  }))

  const likeSignals = likes.map((v) => ({
    source: 'youtube_like' as const,
    youtubeId: v.videoId,
    title: v.title,
    channel: v.channel,
    signalAt: v.publishedAt,
    topics: extractTopicsFromText(`${v.title} ${v.channel}`),
  }))

  await upsertPersonalSignals(userId, subSignals, storage)
  await upsertPersonalSignals(userId, likeSignals, storage)
  await markYouTubeSynced(userId, storage)

  return { subscriptions: subSignals.length, likes: likeSignals.length }
}
