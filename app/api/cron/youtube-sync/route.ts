import { NextResponse } from 'next/server'
import { refreshPersonalProfile } from '@/lib/personal/background-sync'
import { SYNC_MAX_USERS_PER_CRON } from '@/lib/personal/sync-policy'
import { listStaleYouTubeConnections } from '@/lib/personal/signals-repository'
import { syncYouTubeSignals } from '@/lib/personal/youtube-sync'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userIds = await listStaleYouTubeConnections(SYNC_MAX_USERS_PER_CRON)
  const results: Array<{ userId: string; ok: boolean; error?: string }> = []

  for (const userId of userIds) {
    try {
      await syncYouTubeSignals(userId)
      await refreshPersonalProfile(userId)
      results.push({ userId, ok: true })
    } catch (error) {
      results.push({
        userId,
        ok: false,
        error: error instanceof Error ? error.message : 'sync failed',
      })
    }
  }

  return NextResponse.json({ synced: results.filter((r) => r.ok).length, results })
}
