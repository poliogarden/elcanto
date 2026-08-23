import type { Voice } from '@/lib/types/voice'

const STORAGE_KEY = 'elcanto-workspace-selection'

type StoredSelection = {
  voices: Voice[]
  customPrompt: string
  activeChip: string | null
}

export function loadStoredSelection(): StoredSelection | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSelection
  } catch {
    return null
  }
}

export function saveStoredSelection(data: StoredSelection): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded — ignore
  }
}

export function clearStoredSelection(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}
