'use client'

import { signIn } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import type { LibraryItem } from '@/lib/types/library'
import type { VideoSourceItem } from '@/lib/types/selected-source'

export function useLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [requiresAuth, setRequiresAuth] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library')
      const data = (await res.json()) as { items?: LibraryItem[]; requiresAuth?: boolean }
      setItems(data.items ?? [])
      setRequiresAuth(Boolean(data.requiresAuth))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const savedIds = new Set(items.map((i) => i.youtubeId))

  const save = useCallback(
    async (video: VideoSourceItem): Promise<'saved' | 'auth' | 'error'> => {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: video }),
      })
      if (res.status === 401) {
        void signIn('google')
        return 'auth'
      }
      if (!res.ok) return 'error'
      const data = (await res.json()) as { item: LibraryItem }
      setItems((prev) => {
        const rest = prev.filter((i) => i.youtubeId !== data.item.youtubeId)
        return [data.item, ...rest]
      })
      return 'saved'
    },
    [],
  )

  const unsave = useCallback(async (youtubeId: string): Promise<boolean> => {
    const res = await fetch(`/api/library/${encodeURIComponent(youtubeId)}`, { method: 'DELETE' })
    if (!res.ok) return false
    setItems((prev) => prev.filter((i) => i.youtubeId !== youtubeId))
    return true
  }, [])

  return { items, loading, requiresAuth, savedIds, save, unsave, refresh }
}
