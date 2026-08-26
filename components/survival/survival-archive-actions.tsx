'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { markSavedToArchive } from '@/lib/storage/synthesis-session'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

type Props = {
  document: SynthesisDocument
}

export function SurvivalArchiveActions({ document }: Props) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [saved, setSaved] = useState(document.savedToArchive ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document }),
      })
      if (res.ok) {
        markSavedToArchive(document.id)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6 flex justify-end">
      <button
        type="button"
        onClick={() => {
          if (!session) void signIn('google')
          else void handleSave()
        }}
        disabled={saved || saving}
        className="border border-line px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-background disabled:opacity-40"
      >
        {saved ? t('common.saved') : saving ? t('common.saving') : t('common.save')}
      </button>
    </div>
  )
}
