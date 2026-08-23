import { NextResponse } from 'next/server'
import { listUnfiledItems } from '@/lib/library/shelf-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'

export async function GET() {
  const ctx = await resolvePersonalUser()
  if (ctx.isAnonymous) {
    return NextResponse.json({ items: [], requiresAuth: true })
  }
  const items = await listUnfiledItems(ctx.userId)
  return NextResponse.json({ items, requiresAuth: false })
}
