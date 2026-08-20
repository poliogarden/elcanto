'use client'

import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  synthesisId: string
  saved: boolean
  saving: boolean
  onSave: () => void
}

const secondaryActionClass =
  'mono-label border border-line px-4 py-2.5 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background'

export function ResultActions({ synthesisId, saved, saving, onSave }: Props) {
  const { data: session } = useSession()
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => {
          if (!session) void signIn('google')
          else onSave()
        }}
        disabled={saved || saving}
        className="mono-label bg-ink px-5 py-2.5 text-[10px] text-background transition-opacity hover:opacity-90 disabled:opacity-40"
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
