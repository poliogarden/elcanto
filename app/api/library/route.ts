import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listLibraryItems, saveLibraryItem } from '@/lib/library/library-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { videoSourceToLibraryInput } from '@/lib/types/library'
import type { VideoSourceItem } from '@/lib/types/selected-source'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ items: [], requiresAuth: true })
  }

  const items = await listLibraryItems(ctx.userId)
  return NextResponse.json({ items, requiresAuth: false })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to save videos.', code: 'auth_required' }, { status: 401 })
  }

  const body = (await request.json()) as { item?: VideoSourceItem }
  if (!body.item?.videoId || !body.item.title) {
    return NextResponse.json({ error: 'Video item required.' }, { status: 400 })
  }

  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ error: 'Sign in to save videos.', code: 'auth_required' }, { status: 401 })
  }

  const input = videoSourceToLibraryInput(body.item)
  const saved = await saveLibraryItem(ctx.userId, input)
  return NextResponse.json({ item: saved })
}
