import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  synthesisId: string
}

export function CreateFromSection({ synthesisId }: Props) {
  const { t } = useTranslation()

  return (
    <section className="border-b border-line py-10 md:py-12">
      <p className="font-serif text-sm text-ink-soft">{t('result.createFrom')}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/compose/${synthesisId}`}
          className="mono-label border border-line px-5 py-3 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
        >
          {t('result.composeVideo')}
        </Link>
        <Link
          href={`/story/${synthesisId}`}
          className="mono-label border border-line px-5 py-3 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
        >
          {t('result.createShort')}
        </Link>
      </div>
    </section>
  )
}
