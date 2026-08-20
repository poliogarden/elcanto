export const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
export const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'

export const YOUTUBE_SCOPES = `openid email profile ${YOUTUBE_READONLY_SCOPE}`
export const YOUTUBE_UPLOAD_SCOPES = `openid email profile ${YOUTUBE_UPLOAD_SCOPE}`
export const YOUTUBE_FULL_SCOPES = `openid email profile ${YOUTUBE_READONLY_SCOPE} ${YOUTUBE_UPLOAD_SCOPE}`

export function hasYouTubeReadScope(scopes: string[] | undefined): boolean {
  return Boolean(scopes?.includes(YOUTUBE_READONLY_SCOPE))
}

export function hasYouTubeUploadScope(scopes: string[] | undefined): boolean {
  return Boolean(scopes?.includes(YOUTUBE_UPLOAD_SCOPE))
}
