import { getYouTubeConnection, saveYouTubeConnection } from '@/lib/personal/signals-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { refreshAccessToken } from '@/lib/youtube/oauth-client'
import { hasYouTubeUploadScope } from '@/lib/youtube/scopes'

/** Returns a valid YouTube OAuth access token, or null if not connected */
export async function getYouTubeOAuthAccessToken(): Promise<string | null> {
  return getYouTubeOAuthAccessTokenForScope()
}

export async function getYouTubeOAuthAccessTokenForScope(
  requiredScope?: string,
): Promise<string | null> {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) return null

  const storage = { useSupabase: ctx.useSupabase }
  const connection = await getYouTubeConnection(ctx.userId, storage)
  if (!connection?.access_token) return null

  const scopes = (connection.scopes as string[] | undefined) ?? []
  if (requiredScope && !scopes.includes(requiredScope)) {
    return null
  }

  let accessToken = connection.access_token as string
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0

  if (expiresAt && Date.now() > expiresAt - 60_000 && connection.refresh_token) {
    const refreshed = await refreshAccessToken(connection.refresh_token as string)
    accessToken = refreshed.access_token
    await saveYouTubeConnection(
      ctx.userId,
      {
        accessToken,
        refreshToken: connection.refresh_token as string,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        scopes,
      },
      storage,
    )
  }

  return accessToken
}

export async function userCanUploadToYouTube(): Promise<boolean> {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) return false

  const connection = await getYouTubeConnection(ctx.userId, { useSupabase: ctx.useSupabase })
  return hasYouTubeUploadScope((connection?.scopes as string[] | undefined) ?? [])
}
