import { describe, expect, it, vi } from 'vitest'
import {
  pruneOldestByCreatedAt,
  safeSetItem,
  setItemWithQuotaRecovery,
} from '@/lib/storage/storage-quota'

function mockStorage(maxBytes = 5000): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (value.length > maxBytes) {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      data.set(key, value)
    },
    removeItem(key: string) {
      data.delete(key)
    },
  } as Storage
}

describe('storage-quota', () => {
  it('safeSetItem returns false on quota without throwing', () => {
    const storage = mockStorage(10)
    expect(safeSetItem(storage, 'k', 'short')).toBe(true)
    expect(safeSetItem(storage, 'big', 'x'.repeat(20))).toBe(false)
  })

  it('pruneOldestByCreatedAt removes oldest documents', () => {
    const storage = mockStorage(200)
    storage.setItem(
      'elcanto-synthesis-old',
      JSON.stringify({ createdAt: '2020-01-01T00:00:00.000Z' }),
    )
    storage.setItem(
      'elcanto-synthesis-new',
      JSON.stringify({ createdAt: '2025-01-01T00:00:00.000Z' }),
    )
    pruneOldestByCreatedAt(storage, 'elcanto-synthesis-', 1)
    expect(storage.getItem('elcanto-synthesis-old')).toBeNull()
    expect(storage.getItem('elcanto-synthesis-new')).toBeTruthy()
  })

  it('setItemWithQuotaRecovery retries after recover callback', () => {
    const storage = mockStorage(80)
    storage.setItem('elcanto-synthesis-fill', 'x'.repeat(60))
    const ok = setItemWithQuotaRecovery(storage, 'new-key', 'y'.repeat(60), () => {
      storage.removeItem('elcanto-synthesis-fill')
    })
    expect(ok).toBe(true)
    expect(storage.getItem('new-key')).toBeTruthy()
  })
})

describe('synthesis-session draft storage', () => {
  it('saveDraft does not throw when sessionStorage quota is exceeded', async () => {
    const session = mockStorage(120)
    const local = mockStorage(120)

    vi.stubGlobal('window', {
      sessionStorage: session,
      localStorage: local,
    } as Window)

    const { saveDraft, loadDraft } = await import('@/lib/storage/synthesis-session')

    for (let i = 0; i < 12; i++) {
      saveDraft(`id-${i}`, {
        voices: [
          {
            id: `v${i}`,
            n: 1,
            youtubeId: 'dQw4w9WgXcQ',
            url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
            title: `Video ${i} `.repeat(20),
            channel: 'Channel',
            duration: '10:00',
          },
        ],
        customPrompt: 'What is MCP?',
      })
    }

    const id = 'final-draft-id'
    expect(() =>
      saveDraft(id, {
        voices: [
          {
            id: 'v-final',
            n: 1,
            youtubeId: 'dQw4w9WgXcQ',
            url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Final video',
            channel: 'Channel',
            duration: '10:00',
          },
        ],
      }),
    ).not.toThrow()

    const loaded = loadDraft(id)
    expect(loaded?.voices.length).toBe(1)
    expect(loaded?.voices[0]?.title).toBe('Final video')

    vi.unstubAllGlobals()
  })
})
