import { NextResponse } from 'next/server'
import { fetchRecentElcantoSources } from '@/lib/youtube/recent-sources'

export async function GET() {
  try {
    const items = await fetchRecentElcantoSources()
    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load recent sources.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
