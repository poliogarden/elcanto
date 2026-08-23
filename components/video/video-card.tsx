import type { VideoSourceItem } from '@/lib/types/selected-source'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import { SaveButton } from '@/components/video/save-button'

type Props = {
  item: VideoSourceItem
  selected: boolean
  selectionOrder?: number
  saved: boolean
  onToggle: () => void
  onSave: (video: VideoSourceItem) => Promise<'saved' | 'auth' | 'error'>
  onUnsave: (youtubeId: string) => Promise<boolean>
}

function truncateTitle(title: string, max = 72): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1)}…`
}

export function VideoCard({
  item,
  selected,
  selectionOrder,
  saved,
  onToggle,
  onSave,
  onUnsave,
}: Props) {
  const thumbnail = item.thumbnail ?? resolveVideoThumbnail(item.videoId)
  const duration = item.duration && item.duration !== '—' ? item.duration : null

  return (
    <article className="group relative min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-w-0 flex-col text-left"
        aria-pressed={selected}
      >
        <div
          className={`relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-300/30 transition-[box-shadow,transform] duration-150 ${
            selected
              ? 'shadow-[0_0_0_2px_var(--coral),0_0_0_4px_var(--background)]'
              : 'group-hover:shadow-md'
          }`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-200/50 text-xs text-ink-soft">
              —
            </div>
          )}

          {selected && selectionOrder != null ? (
            <span
              className="absolute left-2.5 top-2.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-semibold tabular-nums text-white shadow-sm"
              aria-hidden
            >
              {String(selectionOrder).padStart(2, '0')}
            </span>
          ) : (
            <span
              className="absolute left-2.5 top-2.5 h-5 w-5 rounded-full border-2 border-white/90 bg-black/25 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          )}

          {duration && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex min-w-0 items-start justify-between gap-2 pr-0.5">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-ink sm:text-sm">
              {truncateTitle(item.title)}
            </h3>
            <p className="mt-1 truncate text-xs text-ink-soft">
              {item.channelTitle}
              {duration ? ` · ${duration}` : ''}
            </p>
          </div>
        </div>
      </button>

      <div className="mt-1">
        <SaveButton video={item} saved={saved} onSave={onSave} onUnsave={onUnsave} />
      </div>
    </article>
  )
}
