import { NextResponse } from 'next/server'
import {
  getRecentAIUsage,
  summarizeRecentAIUsage,
} from '@/lib/ai/usage/memory-store'

export const dynamic = 'force-dynamic'

function isDebugAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1'
}

export async function GET(request: Request) {
  if (!isDebugAllowed()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const limit = Math.min(300, Math.max(1, Number(url.searchParams.get('limit') ?? 100)))

  const records = getRecentAIUsage(limit)
  const summary = summarizeRecentAIUsage(records)

  return NextResponse.json({
    summary,
    records: records.slice(-limit),
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  })
}
