import { NextResponse } from 'next/server'
import { resolveCreatorUserId } from '@/lib/creator/auth'
import { getChannelForUser } from '@/lib/creator/repository'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const userId = await resolveCreatorUserId()
  const channel = await getChannelForUser(id, userId)
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ channel })
}
