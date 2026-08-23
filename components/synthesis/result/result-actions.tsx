'use client'

import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  downloadTextFile,
  synthesisResultToMarkdown,
  synthesisResultToPlainText,
} from '@/lib/synthesis/export-result'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisViewModel } from '@/lib/types/view-model'

type Props = {
  synthesisId: string
  view: SynthesisViewModel
  saved: boolean
  saving: boolean
  onSave: () => void
}

const secondaryActionClass =
  'border border-line px-4 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-background'

export function ResultActions({ synthesisId, view, saved, saving, onSave }: Props) {
  const { data: session } = useSession()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(synthesisResultToPlainText(view))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }

  function handleExportMarkdown() {
    downloadTextFile(
      `elcanto-${synthesisId.slice(0, 8)}.md`,
      synthesisResultToMarkdown(view),
      'text/markdown;charset=utf-8',
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => void handleCopy()} className={secondaryActionClass}>
        {copied ? t('result.copied') : t('result.copy')}
      </button>

      <button type="button" onClick={handleExportMarkdown} className={secondaryActionClass}>
        {t('result.exportMarkdown')}
      </button>

      <button
        type="button"
        onClick={() => {
          if (!session) void signIn('google')
          else onSave()
        }}
        disabled={saved || saving}
        className="bg-ink px-5 py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saved ? t('common.saved') : saving ? t('common.saving') : t('common.save')}
      </button>

      <Link href={`/compose/${synthesisId}`} className={secondaryActionClass}>
        {t('result.composeVideo')}
      </Link>

      <Link href={`/story/${synthesisId}`} className={secondaryActionClass}>
        {t('result.createShort')}
      </Link>
    </div>
  )
}
