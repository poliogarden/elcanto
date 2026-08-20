const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

export type YouTubeSubscription = {
  channelId: string
  title: string
  subscribedAt: string
}

export type YouTubeLikedVideo = {
  videoId: string
  title: string
  channel: string
  publishedAt: string
}

export type YouTubePlaylistVideo = YouTubeLikedVideo & {
  playlistId: string
}

export type YouTubePlaylistSummary = {
  playlistId: string
  title: string
  itemCount?: number
  thumbnail?: string
}

export type YouTubeChannelVideo = YouTubeLikedVideo & {
  channelId: string
  thumbnail?: string
}

async function youtubeFetch<T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${YOUTUBE_API}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

export async function fetchSubscriptions(accessToken: string): Promise<YouTubeSubscription[]> {
  const results: YouTubeSubscription[] = []
  let pageToken: string | undefined

  do {
    const data = await youtubeFetch<{
      items?: Array<{
        snippet: {
          title: string
          publishedAt: string
          resourceId: { channelId: string }
        }
      }>
      nextPageToken?: string
    }>(`/subscriptions`, accessToken, {
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    for (const item of data.items ?? []) {
      results.push({
        channelId: item.snippet.resourceId.channelId,
        title: item.snippet.title,
        subscribedAt: item.snippet.publishedAt,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken && results.length < 200)

  return results
}

export async function fetchLikedVideos(accessToken: string): Promise<YouTubeLikedVideo[]> {
  const results: YouTubeLikedVideo[] = []
  let pageToken: string | undefined

  do {
    const data = await youtubeFetch<{
      items?: Array<{
        snippet: {
          title: string
          channelTitle: string
          publishedAt: string
          resourceId: { videoId: string }
        }
      }>
      nextPageToken?: string
    }>(`/playlistItems`, accessToken, {
      part: 'snippet',
      playlistId: 'LL',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    for (const item of data.items ?? []) {
      const videoId = item.snippet.resourceId.videoId
      if (!videoId) continue
      results.push({
        videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken && results.length < 200)

  return results
}

export async function fetchUserPlaylists(accessToken: string): Promise<YouTubePlaylistSummary[]> {
  const results: YouTubePlaylistSummary[] = []
  let pageToken: string | undefined

  do {
    const data = await youtubeFetch<{
      items?: Array<{
        id: string
        snippet: {
          title: string
          thumbnails?: { medium?: { url?: string } }
        }
        contentDetails?: { itemCount?: number }
      }>
      nextPageToken?: string
    }>(`/playlists`, accessToken, {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    for (const item of data.items ?? []) {
      results.push({
        playlistId: item.id,
        title: item.snippet.title,
        itemCount: item.contentDetails?.itemCount,
        thumbnail: item.snippet.thumbnails?.medium?.url,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken && results.length < 100)

  return results
}

export async function fetchPlaylistVideos(
  accessToken: string,
  playlistId: string,
  maxResults = 50,
): Promise<YouTubePlaylistVideo[]> {
  const results: YouTubePlaylistVideo[] = []
  let pageToken: string | undefined

  do {
    const data = await youtubeFetch<{
      items?: Array<{
        snippet: {
          title: string
          channelTitle: string
          publishedAt: string
          resourceId: { videoId: string }
        }
      }>
      nextPageToken?: string
    }>(`/playlistItems`, accessToken, {
      part: 'snippet',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    for (const item of data.items ?? []) {
      const videoId = item.snippet.resourceId.videoId
      if (!videoId) continue
      results.push({
        videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        playlistId,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken && results.length < maxResults)

  return results.slice(0, maxResults)
}

export async function fetchPlaylistTitle(accessToken: string, playlistId: string): Promise<string> {
  const data = await youtubeFetch<{
    items?: Array<{ snippet: { title: string } }>
  }>(`/playlists`, accessToken, {
    part: 'snippet',
    id: playlistId,
  })

  return data.items?.[0]?.snippet.title ?? playlistId
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error('Failed to refresh YouTube access token.')
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>
}
