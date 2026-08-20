import { extractTopicsFromText } from '@/lib/personal/taste-engine'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { upsertPersonalSignals } from '@/lib/personal/signals-repository'
import type { PersonalSignalSource } from '@/lib/types/personal'

export async function recordElcantoSignals(
  userId: string,
  items: Array<{
    source: Extract<PersonalSignalSource, 'elcanto_added' | 'elcanto_synthesis' | 'elcanto_saved'>
    youtubeId?: string
    title: string
    channel?: string
    signalAt?: string
  }>,
  options?: { useSupabase?: boolean },
): Promise<void> {
  if (items.length === 0) return

  await upsertPersonalSignals(
    userId,
    items.map((item) => ({
      source: item.source,
      youtubeId: item.youtubeId,
      title: item.title,
      channel: item.channel,
      signalAt: item.signalAt ?? new Date().toISOString(),
      topics: extractTopicsFromText(`${item.title} ${item.channel ?? ''}`),
    })),
    options,
  )
}

export async function recordElcantoSignalsForSession(
  items: Parameters<typeof recordElcantoSignals>[1],
): Promise<void> {
  const ctx = await resolvePersonalUser()
  await recordElcantoSignals(ctx.userId, items, { useSupabase: ctx.useSupabase })
}
