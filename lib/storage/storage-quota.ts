export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return true
  if (error instanceof Error && error.name === 'QuotaExceededError') return true
  return false
}

export function safeSetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    if (isQuotaExceededError(error)) return false
    throw error
  }
}

export function listKeysWithPrefix(storage: Storage, prefix: string): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  return keys
}

export function pruneKeys(storage: Storage, keys: string[]): void {
  for (const key of keys) {
    try {
      storage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

/** Drop oldest keys under prefix, optionally preserving one key. */
export function pruneStorageByPrefix(
  storage: Storage,
  prefix: string,
  options?: { keepKey?: string; maxKeep?: number },
): number {
  const keepKey = options?.keepKey
  const maxKeep = options?.maxKeep ?? 8
  const keys = listKeysWithPrefix(storage, prefix)
  const removable = keys.filter((k) => k !== keepKey)
  const excess = removable.length - maxKeep + (keepKey && keys.includes(keepKey) ? 1 : 0)
  if (excess <= 0) return 0
  pruneKeys(storage, removable.slice(0, excess))
  return excess
}

/** Remove oldest synthesis documents by createdAt when localStorage is full. */
export function pruneOldestByCreatedAt(
  storage: Storage,
  prefix: string,
  countToRemove: number,
): number {
  if (countToRemove <= 0) return 0
  const keys = listKeysWithPrefix(storage, prefix)
  const dated = keys.map((key) => {
    try {
      const raw = storage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : null
      return { key, createdAt: typeof parsed?.createdAt === 'string' ? parsed.createdAt : '' }
    } catch {
      return { key, createdAt: '' }
    }
  })
  dated.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
  const remove = dated.slice(0, countToRemove).map((d) => d.key)
  pruneKeys(storage, remove)
  return remove.length
}

export function setItemWithQuotaRecovery(
  storage: Storage,
  key: string,
  value: string,
  recover: () => void,
): boolean {
  if (safeSetItem(storage, key, value)) return true
  recover()
  return safeSetItem(storage, key, value)
}
