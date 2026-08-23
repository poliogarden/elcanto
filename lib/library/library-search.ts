import type { LibraryItem } from '@/lib/types/library'

/** P0: title/channel search. Extensible for transcript/semantic later. */
export function searchLibraryItems(items: LibraryItem[], query: string): LibraryItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.channelName?.toLowerCase().includes(q) ?? false),
  )
}
