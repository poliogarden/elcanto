import type { RenderManifest } from '@/lib/compose/render-manifest'

export type YouTubeUploadPrivacy = 'private' | 'unlisted' | 'public'

export type YouTubeUploadInput = {
  accessToken: string
  video: Buffer
  title: string
  description: string
  privacyStatus?: YouTubeUploadPrivacy
  tags?: string[]
}

export type YouTubeUploadResult = {
  videoId: string
  watchUrl: string
}

export function buildYouTubeUploadDescription(manifest: RenderManifest): string {
  const lines = [
    manifest.thesis || manifest.title,
    '',
    'Sources:',
    ...manifest.attribution.map(
      (source) => `• ${source.title} — ${source.channel}\n  ${source.watchUrl}`,
    ),
    '',
    'Composed with elcanto.',
  ]
  return lines.join('\n').slice(0, 4900)
}

export function buildYouTubeUploadTitle(manifest: RenderManifest): string {
  const base = manifest.title || manifest.thesis || 'elcanto composition'
  return base.slice(0, 95)
}

export async function uploadVideoToYouTube(input: YouTubeUploadInput): Promise<YouTubeUploadResult> {
  const privacyStatus = input.privacyStatus ?? 'private'
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(input.video.byteLength),
      },
      body: JSON.stringify({
        snippet: {
          title: input.title,
          description: input.description,
          categoryId: '22',
          tags: input.tags ?? ['elcanto', 'synthesis'],
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  )

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`YouTube upload init failed (${initRes.status}): ${text}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    throw new Error('YouTube upload init did not return a resumable URL.')
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(input.video.byteLength),
    },
    body: new Uint8Array(input.video),
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${text}`)
  }

  const data = (await uploadRes.json()) as { id?: string }
  if (!data.id) {
    throw new Error('YouTube upload completed without a video id.')
  }

  return {
    videoId: data.id,
    watchUrl: `https://www.youtube.com/watch?v=${data.id}`,
  }
}
