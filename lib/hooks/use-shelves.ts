'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LibraryItem } from '@/lib/types/library'
import type { ShelfWithPreview } from '@/lib/types/shelf'

export function useShelves() {
  const [shelves, setShelves] = useState<ShelfWithPreview[]>([])
  const [unfiled, setUnfiled] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [shelvesRes, unfiledRes] = await Promise.all([
        fetch('/api/library/shelves'),
        fetch('/api/library/unfiled'),
      ])
      const shelvesData = (await shelvesRes.json()) as { shelves?: ShelfWithPreview[] }
      const unfiledData = (await unfiledRes.json()) as { items?: LibraryItem[] }
      setShelves(shelvesData.shelves ?? [])
      setUnfiled(unfiledData.items ?? [])
    } catch {
      setShelves([])
      setUnfiled([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createShelf = useCallback(
    async (name: string): Promise<ShelfWithPreview | null> => {
      const res = await fetch('/api/library/shelves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { shelf: ShelfWithPreview }
      setShelves((prev) => [...prev, { ...data.shelf, videoCount: 0, previewThumbnails: [] }])
      return data.shelf
    },
    [],
  )

  const renameShelf = useCallback(async (id: string, name: string): Promise<boolean> => {
    const res = await fetch(`/api/library/shelves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return false
    setShelves((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
    return true
  }, [])

  const deleteShelf = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/library/shelves/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    setShelves((prev) => prev.filter((s) => s.id !== id))
    void refresh()
    return true
  }, [refresh])

  const addToShelf = useCallback(
    async (shelfId: string, youtubeId: string): Promise<boolean> => {
      const res = await fetch(`/api/library/shelves/${shelfId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeId }),
      })
      if (!res.ok) return false
      setUnfiled((prev) => prev.filter((i) => i.youtubeId !== youtubeId))
      void refresh()
      return true
    },
    [refresh],
  )

  const removeFromShelf = useCallback(
    async (shelfId: string, youtubeId: string): Promise<boolean> => {
      const res = await fetch(`/api/library/shelves/${shelfId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeId }),
      })
      if (!res.ok) return false
      void refresh()
      return true
    },
    [refresh],
  )

  return {
    shelves,
    unfiled,
    unfiledCount: unfiled.length,
    loading,
    refresh,
    createShelf,
    renameShelf,
    deleteShelf,
    addToShelf,
    removeFromShelf,
  }
}
