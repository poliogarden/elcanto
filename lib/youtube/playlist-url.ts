export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^PL[\w-]+$/i.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    const list = url.searchParams.get('list')
    if (list) return list
    const match = url.pathname.match(/\/playlist\/(PL[\w-]+)/i)
    if (match?.[1]) return match[1]
  } catch {
    // not a URL
  }

  return null
}
