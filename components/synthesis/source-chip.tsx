import type { Voice } from '@/lib/types/voice'

type Props = {
  voice: number
  title?: string
  thumbnail?: string
  voices?: Voice[]
}

export function SourceChip({ voice, title, thumbnail, voices }: Props) {
  const meta = voices?.find((v) => v.n === voice)
  const label = title ?? meta?.title ?? `Source ${String(voice).padStart(2, '0')}`
  const thumb = thumbnail ?? meta?.thumbnail

  return (
    <span className="inline-flex max-w-xs items-center gap-2 border border-line bg-paper px-2 py-1">
      {thumb && (
        <img src={thumb} alt="" className="h-6 w-10 shrink-0 border border-line object-cover" />
      )}
      <span className="mono text-[10px] text-ink">
        {String(voice).padStart(2, '0')}
        <span className="ml-2 truncate font-serif normal-case text-ink-soft">{label}</span>
      </span>
    </span>
  )
}
