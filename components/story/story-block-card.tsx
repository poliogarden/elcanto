'use client'

import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { StoryBlock } from '@/lib/types/story-plan'

type Props = {
  block: StoryBlock
  index: number
  onEditTop: (text: string) => void
  onEditBottom: (text: string) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function blockLabel(type: StoryBlock['type']): string {
  return type.toUpperCase()
}

export function StoryBlockCard({
  block,
  index,
  onEditTop,
  onEditBottom,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const isClip = block.type === 'clip'
  const isInsight = block.type === 'insight'

  return (
    <article className="border border-line bg-background">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="mono-label text-[10px] text-ink-soft">
          {String(index + 1).padStart(2, '0')} · {blockLabel(block.type)}
        </span>
        <div className="flex gap-2">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="mono text-[10px] text-ink-soft hover:text-ink">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="mono text-[10px] text-ink-soft hover:text-ink">
              ↓
            </button>
          )}
          {isClip && (
            <button type="button" onClick={onRemove} className="mono-label text-[9px] text-ink-soft hover:text-ink">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isClip && (
          <div className="mb-4 flex gap-4">
            <div className="h-16 w-28 shrink-0 border border-line bg-paper-2">
              {block.thumbnail ? (
                <img src={block.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="mono text-[10px] text-ink-soft">
                {block.sourceTitle ?? 'Source'}
                {block.sourceStart !== undefined && block.sourceEnd !== undefined && (
                  <>
                    {' · '}
                    {formatTimestamp(block.sourceStart)} → {formatTimestamp(block.sourceEnd)}
                  </>
                )}
              </p>
              {block.channelName && (
                <p className="mono mt-1 truncate text-[10px] text-ink-soft">{block.channelName}</p>
              )}
            </div>
          </div>
        )}

        <label className="block">
          <span className="mono-label text-[9px] text-ink-soft">
            {isInsight ? '✦ INSIGHT' : 'TOP TEXT'}
          </span>
          <textarea
            value={block.topText ?? ''}
            onChange={(e) => onEditTop(e.target.value)}
            rows={isInsight ? 3 : 2}
            className={`mt-2 w-full resize-none border border-line bg-transparent px-3 py-2 font-serif text-base leading-snug focus:outline-none ${
              isInsight ? 'border-l-2 border-l-mint pl-3' : ''
            }`}
          />
        </label>

        {(isClip || block.bottomText) && (
          <label className="mt-4 block">
            <span className="mono-label text-[9px] text-ink-soft">BOTTOM TEXT · WHAT IT MEANS</span>
            <textarea
              value={block.bottomText ?? ''}
              onChange={(e) => onEditBottom(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none border border-line bg-transparent px-3 py-2 font-serif text-sm text-ink-soft focus:outline-none"
            />
          </label>
        )}
      </div>
    </article>
  )
}
