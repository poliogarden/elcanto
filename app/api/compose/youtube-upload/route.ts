import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadRenderJob } from '@/lib/compose/render-job-repository'
import { getRenderOutputPath } from '@/lib/compose/render-asset-store'
import { getYouTubeOAuthAccessTokenForScope } from '@/lib/youtube/oauth-access'
import { YOUTUBE_UPLOAD_SCOPE } from '@/lib/youtube/scopes'
import {
  buildYouTubeUploadDescription,
  buildYouTubeUploadTitle,
  uploadVideoToYouTube,
  type YouTubeUploadPrivacy,
} from '@/lib/youtube/upload-video'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      jobId?: string
      title?: string
      description?: string
      privacyStatus?: YouTubeUploadPrivacy
    }

    if (!body.jobId) {
      return NextResponse.json({ error: 'jobId required.' }, { status: 400 })
    }

    const accessToken = await getYouTubeOAuthAccessTokenForScope(YOUTUBE_UPLOAD_SCOPE)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'YouTube upload permission required. Connect your channel first.' },
        { status: 403 },
      )
    }

    const job = await loadRenderJob(body.jobId)
    if (!job || job.status !== 'complete') {
      return NextResponse.json({ error: 'Completed render job required.' }, { status: 400 })
    }

    const filename = `${job.compositionId}.mp4`
    let video: Buffer

    try {
      video = await readFile(getRenderOutputPath(body.jobId, filename))
    } catch {
      if (!job.outputUrl) {
        return NextResponse.json({ error: 'Rendered MP4 not found.' }, { status: 404 })
      }

      const fetchUrl = job.outputUrl.startsWith('http')
        ? job.outputUrl
        : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${job.outputUrl}`

      const res = await fetch(fetchUrl)
      if (!res.ok) {
        return NextResponse.json({ error: 'Rendered MP4 not found.' }, { status: 404 })
      }
      video = Buffer.from(await res.arrayBuffer())
    }

    const manifest = job.manifest
    const title = body.title?.trim() || (manifest ? buildYouTubeUploadTitle(manifest) : 'elcanto composition')
    const description =
      body.description?.trim() ||
      (manifest ? buildYouTubeUploadDescription(manifest) : 'Composed with elcanto.')

    const result = await uploadVideoToYouTube({
      accessToken,
      video,
      title,
      description,
      privacyStatus: body.privacyStatus ?? 'private',
    })

    return NextResponse.json({
      videoId: result.videoId,
      watchUrl: result.watchUrl,
      privacyStatus: body.privacyStatus ?? 'private',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'YouTube upload failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
