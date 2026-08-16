import { NextResponse } from 'next/server'
import { fetchYouTubeMetadata } from '@/lib/youtube/metadata'
import { parseYouTubeUrl } from '@/lib/youtube/url'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string }
    const input = body.url?.trim()

    if (!input) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
    }

    const parsed = parseYouTubeUrl(input)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const metadata = await fetchYouTubeMetadata(parsed.youtubeId, parsed.canonicalUrl)
    return NextResponse.json(metadata)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Metadata fetch failed.'
    const status = message.includes('not found') || message.includes('private') ? 404 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
