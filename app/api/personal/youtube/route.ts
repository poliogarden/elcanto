import { NextResponse } from 'next/server'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { deleteYouTubeConnection } from '@/lib/personal/signals-repository'

export async function DELETE() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ disconnected: true })
  }

  await deleteYouTubeConnection(ctx.userId, { useSupabase: ctx.useSupabase })
  return NextResponse.json({ disconnected: true })
}
