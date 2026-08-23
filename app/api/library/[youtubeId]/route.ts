import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { removeLibraryItem } from '@/lib/library/library-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

type Params = { params: Promise<{ youtubeId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const { youtubeId } = await params
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  const removed = await removeLibraryItem(ctx.userId, decodeURIComponent(youtubeId))
  return NextResponse.json({ removed })
}
