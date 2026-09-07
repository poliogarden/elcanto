import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { creatorAssetDir } from '@/lib/creator/storage/local-store'
import { getProjectForUser } from '@/lib/creator/repository'
import { resolveCreatorUserId } from '@/lib/creator/auth'

type Params = { params: Promise<{ projectId: string; file: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { projectId, file } = await params
  const userId = await resolveCreatorUserId()
  const project = await getProjectForUser(projectId, userId)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!/^[\w.-]+$/.test(file)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const filePath = path.join(creatorAssetDir(projectId), file)
  try {
    const buf = await readFile(filePath)
    const contentType = file.endsWith('.mp3')
      ? 'audio/mpeg'
      : file.endsWith('.mp4')
        ? 'video/mp4'
        : file.endsWith('.svg')
          ? 'image/svg+xml'
          : file.endsWith('.png')
            ? 'image/png'
            : 'application/octet-stream'
    return new NextResponse(buf, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
