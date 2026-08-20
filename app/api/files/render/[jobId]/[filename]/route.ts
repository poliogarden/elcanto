import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getRenderAssetPath, getRenderOutputPath } from '@/lib/compose/render-asset-store'

type Params = { params: Promise<{ jobId: string; filename: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { jobId, filename } = await params

  if (!/^[\w.-]+$/.test(filename)) {
    return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 })
  }

  const assetPath = getRenderAssetPath(jobId, filename)
  const outputPath = getRenderOutputPath(jobId, filename)

  for (const filePath of [assetPath, outputPath]) {
    try {
      const body = await readFile(filePath)
      const contentType = filename.endsWith('.mp4')
        ? 'video/mp4'
        : filename.endsWith('.mp3')
          ? 'audio/mpeg'
          : 'application/octet-stream'

      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch {
      // try next path
    }
  }

  return NextResponse.json({ error: 'File not found.' }, { status: 404 })
}
