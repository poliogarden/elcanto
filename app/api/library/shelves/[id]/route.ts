import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  deleteShelf,
  getShelfItems,
  renameShelf,
} from '@/lib/library/shelf-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const items = await getShelfItems(ctx.userId, id)
  return NextResponse.json({ items })
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await resolvePersonalUser()
  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Shelf name required.' }, { status: 400 })
  }

  const shelf = await renameShelf(ctx.userId, id, name)
  if (!shelf) {
    return NextResponse.json({ error: 'Shelf not found.' }, { status: 404 })
  }
  return NextResponse.json({ shelf })
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const { id } = await params
  const ctx = await resolvePersonalUser()
  const ok = await deleteShelf(ctx.userId, id)
  if (!ok) {
    return NextResponse.json({ error: 'Shelf not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
