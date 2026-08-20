import type { VideoSourceItem } from '@/lib/types/selected-source'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'

type Props = {
  item: VideoSourceItem
  selected: boolean
  selectionOrder?: number
  onToggle: () => void
  onOpenYouTube?: () => void
}

function truncateTitle(title: string, max = 72): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1)}…`
}

export function VideoSourceCard({
  item,
  selected,
  selectionOrder,
  onToggle,
  onOpenYouTube,
}: Props) {
  const isSample = Boolean(item.sample)

  return (
    <article
      className={`group relative flex min-w-0 flex-col border bg-background transition-colors ${
        selected
          ? 'border-mint bg-mint/5 ring-1 ring-mint/40'
          : 'border-line hover:border-ink/30'
      }`}
    >
      {isSample && (
        <span className="mono-label absolute left-2 top-2 z-10 border border-line bg-background px-2 py-0.5 text-[9px]">
          EXAMPLE
        </span>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={isSample}
        className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default"
        aria-pressed={selected}
      >
        <div className="relative aspect-[16/10] w-full border-b border-line bg-paper-2">
          {(item.thumbnail ?? resolveVideoThumbnail(item.videoId)) ? (
            <img
              src={item.thumbnail ?? resolveVideoThumbnail(item.videoId)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="mono text-[10px] text-ink-soft">—</span>
            </div>
          )}

          {selected && selectionOrder != null && (
            <span className="mono absolute left-2 top-2 flex h-7 w-7 items-center justify-center border border-mint bg-background text-[11px] text-mint-ink">
              {selectionOrder}
            </span>
          )}

          {selected && (
            <span
              className="mono absolute right-2 top-2 flex h-6 w-6 items-center justify-center border border-mint bg-mint/20 text-[10px] text-mint-ink"
              aria-hidden
            >
              ✓
            </span>
          )}

          {item.duration && item.duration !== '—' && (
            <span className="mono absolute bottom-2 right-2 bg-ink/90 px-1.5 py-0.5 text-[10px] text-background">
              {item.duration}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5 md:p-3">
          <h3 className="line-clamp-2 text-sm leading-snug tracking-tight text-ink">
            {truncateTitle(item.title)}
          </h3>
          <p className="mono mt-1.5 truncate text-[10px] text-ink-soft">
            {item.channelTitle}
            {item.duration && item.duration !== '—' ? ` · ${item.duration}` : ''}
          </p>
        </div>
      </button>

      {onOpenYouTube && !isSample && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenYouTube()
          }}
          className="mono-label absolute right-2 top-2 border border-line bg-background px-2 py-0.5 text-[9px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink hover:text-background"
          aria-label="Open on YouTube"
        >
          ↗
        </button>
      )}
    </article>
  )
}
