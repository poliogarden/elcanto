/**
 * In-process TTL cache for MVP (Vercel serverless: per-instance only).
 * Replace with Supabase-backed cache when persistence is required.
 */

type Entry<T> = { value: T; expiresAt: number }

export class MemoryCache<T> {
  private store = new Map<string, Entry<T>>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }
}
