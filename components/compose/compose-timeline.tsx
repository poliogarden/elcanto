import { formatTimestamp } from '@/lib/youtube/timestamp'
import { flattenCompositionTimeline } from '@/lib/types/composition'
import type { Composition } from '@/lib/types/composition'

type Props = {
  composition: Composition
}

export function ComposeTimeline({ composition }: Props) {
  const rows = flattenCompositionTimeline(composition)

  return (
    <section className="border border-line p-5 md:p-8">
      <span className="mono-label text-[10px] text-ink-soft">COMPOSITION</span>
      <div className="mt-6 font-mono text-[12px] leading-7 text-ink">
        <p>00:00</p>
        <p>│</p>
        {rows.map((row, index) => (
          <div key={`${row.sectionTitle}-${index}`} className="mb-1">
            <p>├── {row.item.kind === 'clip' ? `SOURCE ${String(row.item.clip.voiceIndex).padStart(2, '0')}` : 'INSIGHT'}</p>
            <p className="pl-6 text-ink-soft">
              {formatTimestamp(row.startsAt)} → {formatTimestamp(row.endsAt)}
            </p>
            <p className="pl-6 uppercase text-ink-soft">{row.sectionTitle}</p>
            {row.item.kind === 'clip' && (
              <p className="pl-6 text-ink-soft">
                {formatTimestamp(row.item.clip.startSeconds)} → {formatTimestamp(row.item.clip.endSeconds)} in source
              </p>
            )}
          </div>
        ))}
        <p>│</p>
        <p>{formatTimestamp(rows.at(-1)?.endsAt ?? composition.totalDurationSeconds)}</p>
      </div>
    </section>
  )
}
