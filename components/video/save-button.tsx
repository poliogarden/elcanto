'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { VideoSourceItem } from '@/lib/types/selected-source'

type Props = {
  video: VideoSourceItem
  saved: boolean
  onSave: (video: VideoSourceItem) => Promise<'saved' | 'auth' | 'error'>
  onUnsave: (youtubeId: string) => Promise<boolean>
  className?: string
}

export function SaveButton({ video, saved, onSave, onUnsave, className = '' }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (saved) {
        await onUnsave(video.videoId)
      } else {
        const result = await onSave(video)
        if (result === 'auth') void signIn('google')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={busy}
      className={`text-xs font-medium transition-colors ${
        saved ? 'text-coral' : 'text-ink-soft hover:text-ink'
      } disabled:opacity-50 ${className}`}
      aria-pressed={saved}
    >
      {saved ? t('library.saved') : t('library.save')}
    </button>
  )
}
