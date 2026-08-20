import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { CompositionClip } from '@/lib/types/composition'

type Props = {
  clip: CompositionClip
  onEdit?: () => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function clipDuration(clip: CompositionClip): number {
  return Math.max(1, Math.round(clip.endSeconds - clip.startSeconds))
}

export function ComposeClipCard({ clip, onEdit, onRemove, onMoveUp, onMoveDown }: Props) {
  return (
    <article className="border border-line p-5">
      <div className="flex flex-wrap gap-5">
        {clip.thumbnail && (
          <img
            src={clip.thumbnail}
            alt=""
            className="h-20 w-36 shrink-0 border border-line object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="mono-label text-[10px] text-ink-soft">
                SOURCE {String(clip.voiceIndex).padStart(2, '0')}
              </span>
              <h4 className="mt-2 font-serif text-xl font-medium leading-tight">{clip.title}</h4>
              <p className="mono mt-1 text-[11px] text-ink-soft">{clip.channel}</p>
            </div>
            <div className="text-right">
              <p className="mono text-[11px] text-ink">
                {formatTimestamp(clip.startSeconds)} → {formatTimestamp(clip.endSeconds)}
              </p>
              <p className="mono-label mt-1 text-[10px] text-ink-soft">{clipDuration(clip)} SEC</p>
            </div>
          </div>

          <blockquote className="mt-4 border-l-2 border-line pl-4 font-serif text-base leading-relaxed text-ink-soft">
            &ldquo;{clip.quote}&rdquo;
          </blockquote>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <span className="mono-label text-[10px] text-ink-soft">ROLE</span>
              <p className="mono mt-1 text-[11px] uppercase">{clip.role.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                >
                  Edit timestamps
                </button>
              )}
              {onMoveUp && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                >
                  Move up
                </button>
              )}
              {onMoveDown && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                >
                  Move down
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="mono-label border border-line px-3 py-2 text-[10px] text-ink-soft hover:bg-ink hover:text-background"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
