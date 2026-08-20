import type { SourceNode } from '@/lib/home/visual-synthesis-map-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voice?: Voice
  sample?: SourceNode
  onRemove?: () => void
  compact?: boolean
}

function truncateTitle(title: string, max = 56): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1)}…`
}

export function HomeVideoCard({ voice, sample, onRemove, compact = false }: Props) {
  const isSample = Boolean(sample?.sample)
  const title = voice?.title ?? sample?.title ?? 'Untitled video'
  const voiceIndex = voice?.n ?? sample?.voiceIndex ?? 0
  const channel = voice?.channel ?? sample?.channel ?? 'Sample channel'
  const duration =
    voice?.duration && voice.duration !== '—'
      ? voice.duration
      : sample?.duration
  const thumbnail = voice?.thumbnail ?? sample?.thumbnail

  return (
    <article className="group relative flex min-w-0 flex-col border border-line bg-background">
      {isSample && (
        <span className="mono-label absolute left-2 top-2 z-10 border border-line bg-background px-2 py-0.5 text-[9px]">
          SAMPLE
        </span>
      )}

      <div className="relative aspect-video w-full border-b border-line bg-paper-2">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-paper-2">
            <span className="mono text-[10px] text-ink-soft">
              {String(voiceIndex).padStart(2, '0')}
            </span>
          </div>
        )}
        {duration && (
          <span className="mono absolute bottom-2 right-2 bg-ink px-1.5 py-0.5 text-[10px] text-background">
            {duration}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-2' : 'p-3'}`}>
        <span className="mono-label text-[10px] text-ink-soft">
          SOURCE {String(voiceIndex).padStart(2, '0')}
        </span>
        <h3
          className={`mt-1.5 line-clamp-2 font-serif leading-snug ${
            compact ? 'text-sm' : 'mt-2 text-base'
          }`}
        >
          {truncateTitle(title, compact ? 48 : 56)}
        </h3>
        {!compact && (
          <p className="mono mt-2 truncate text-[10px] text-ink-soft">{channel}</p>
        )}
      </div>

      {onRemove && voice && (
        <button
          type="button"
          onClick={onRemove}
          className="mono-label absolute right-2 top-2 border border-line bg-background px-2 py-1 text-[9px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink hover:text-background"
        >
          Remove
        </button>
      )}
    </article>
  )
}
