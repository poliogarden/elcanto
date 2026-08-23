import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createShelf, listShelves } from '@/lib/library/shelf-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ shelves: [], requiresAuth: true })
  }
  const shelves = await listShelves(ctx.userId)
  return NextResponse.json({ shelves, requiresAuth: false })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.', code: 'auth_required' }, { status: 401 })
  }

  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ error: 'Sign in required.', code: 'auth_required' }, { status: 401 })
  }

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Shelf name required.' }, { status: 400 })
  }

  const shelf = await createShelf(ctx.userId, name)
  return NextResponse.json({
    shelf: { ...shelf, videoCount: 0, previewThumbnails: [] },
  })
}
