'use client'

import { useState } from 'react'

type YouTubeInputProps = {
  count: number
  disabled?: boolean
  onAdd: (url: string) => Promise<void>
}

export function YouTubeInput({ count, disabled, onAdd }: YouTubeInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    const url = value.trim()
    if (!url || loading || disabled) return

    setError(null)
    setLoading(true)
    try {
      await onAdd(url)
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add video.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-b border-line px-5 py-10 md:px-8 md:py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="mono-label text-xs text-ink">Add your voices</h2>
        <span className="mono-label text-xs text-ink-soft">
          {count} {count === 1 ? 'voice' : 'voices'}
        </span>
      </div>

      <div className="flex flex-col border border-line sm:flex-row">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              void submit()
            }
          }}
          disabled={loading || disabled}
          placeholder="Paste a YouTube URL..."
          className="mono flex-1 bg-transparent px-4 py-4 text-sm text-ink placeholder:text-ink-soft focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading || disabled || !value.trim()}
          className="mono-label border-t border-line bg-ink px-6 py-4 text-xs text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 sm:border-l sm:border-t-0"
        >
          {loading ? 'Adding…' : `Add Video ${'\u2192'}`}
        </button>
      </div>

      {error && (
        <p className="mono mt-3 text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="mono mt-3 text-[11px] text-ink-soft">
        Supports youtube.com/watch, youtu.be, and youtube.com/shorts links.
      </p>
    </div>
  )
}
