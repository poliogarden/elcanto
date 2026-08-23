import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addVideoToShelf, removeVideoFromShelf } from '@/lib/library/shelf-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await resolvePersonalUser()
  const body = (await request.json()) as { youtubeId?: string }
  if (!body.youtubeId) {
    return NextResponse.json({ error: 'youtubeId required.' }, { status: 400 })
  }

  const ok = await addVideoToShelf(ctx.userId, id, body.youtubeId)
  if (!ok) {
    return NextResponse.json(
      { error: 'Save video to library first, or shelf not found.' },
      { status: 400 },
    )
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await resolvePersonalUser()
  const body = (await request.json()) as { youtubeId?: string }
  if (!body.youtubeId) {
    return NextResponse.json({ error: 'youtubeId required.' }, { status: 400 })
  }

  const ok = await removeVideoFromShelf(ctx.userId, id, body.youtubeId)
  if (!ok) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
