import { describe, expect, it } from 'vitest'
import { searchLibraryItems } from '@/lib/library/library-search'
import type { LibraryItem } from '@/lib/types/library'

const sample: LibraryItem[] = [
  {
    id: '1',
    userId: 'u',
    youtubeId: 'a',
    title: 'MCP vs API comparison',
    channelName: 'Tech Channel',
    savedAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: '2',
    userId: 'u',
    youtubeId: 'b',
    title: 'Startup ideas',
    channelName: 'Business Daily',
    savedAt: '2026-01-02',
    updatedAt: '2026-01-02',
  },
]

describe('searchLibraryItems', () => {
  it('returns all items for empty query', () => {
    expect(searchLibraryItems(sample, '')).toHaveLength(2)
  })

  it('matches title', () => {
    expect(searchLibraryItems(sample, 'mcp')).toHaveLength(1)
  })

  it('matches channel', () => {
    expect(searchLibraryItems(sample, 'business')).toHaveLength(1)
  })
})
