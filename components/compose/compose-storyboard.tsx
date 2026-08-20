'use client'

import Image from 'next/image'
import { AsterismMark } from '@/components/brand/asterism-mark'
import {
  buildStoryboardRows,
  selectionKey,
  type StoryboardRow,
  type StoryboardSelection,
} from '@/lib/compose/storyboard-rows'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { Composition } from '@/lib/types/composition'

type DragState = { sectionId: string; itemIndex: number } | null

type Props = {
  composition: Composition
  selected: StoryboardSelection | null
  drag: DragState
  dropTarget: StoryboardSelection | null
  onSelect: (sel: StoryboardSelection) => void
  onDragStart: (sel: StoryboardSelection) => void
  onDragOver: (sel: StoryboardSelection) => void
}

function clipThumbnail(youtubeId: string, thumbnail?: string): string {
  return thumbnail ?? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
}

function truncate(text: string, max = 72): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function ComposeStoryboard({
  composition,
  selected,
  drag,
  dropTarget,
  onSelect,
  onDragStart,
  onDragOver,
}: Props) {
  const rows = buildStoryboardRows(composition)
  const sceneCount = rows.length
  const totalDuration = composition.totalDurationSeconds

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label text-[10px] text-ink-soft">YOUR STORY</span>
          <p className="mt-1 font-serif text-sm text-ink-soft">
            {sceneCount} scene{sceneCount === 1 ? '' : 's'} · {formatTimestamp(totalDuration)}
          </p>
        </div>
        <p className="mono text-[11px] text-ink-soft">{formatTimestamp(totalDuration)}</p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-min items-stretch gap-0 py-1">
          {rows.map((row, index) => (
            <div key={selectionKey(row)} className="flex items-stretch">
              {index > 0 && (
                <div className="flex w-8 shrink-0 items-center justify-center md:w-10">
                  <span className="mono text-sm text-ink-soft" aria-hidden>
                    →
                  </span>
                </div>
              )}
              <StoryboardCard
                row={row}
                selected={selected ? selectionKey(selected) === selectionKey(row) : false}
                isDragging={
                  drag?.sectionId === row.sectionId && drag.itemIndex === row.itemIndex
                }
                isDropTarget={
                  dropTarget?.sectionId === row.sectionId &&
                  dropTarget.itemIndex === row.itemIndex
                }
                onSelect={() => onSelect({ sectionId: row.sectionId, itemIndex: row.itemIndex })}
                onDragStart={() =>
                  onDragStart({ sectionId: row.sectionId, itemIndex: row.itemIndex })
                }
                onDragOver={() =>
                  onDragOver({ sectionId: row.sectionId, itemIndex: row.itemIndex })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StoryboardCard({
  row,
  selected,
  isDragging,
  isDropTarget,
  onSelect,
  onDragStart,
  onDragOver,
}: {
  row: StoryboardRow
  selected: boolean
  isDragging: boolean
  isDropTarget: boolean
  onSelect: () => void
  onDragStart: () => void
  onDragOver: () => void
}) {
  if (row.item.kind === 'clip') {
    const clip = row.item.clip
    return (
      <button
        type="button"
        draggable
        onClick={onSelect}
        onDragStart={(e) => {
          e.stopPropagation()
          onDragStart()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          onDragOver()
        }}
        className={`group w-[168px] shrink-0 border text-left transition-colors md:w-[188px] ${
          selected
            ? 'border-ink bg-paper-2/80 ring-1 ring-ink'
            : 'border-line bg-background hover:border-ink/40'
        } ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-mint-ink' : ''}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-paper-2">
          <Image
            src={clipThumbnail(clip.youtubeId, clip.thumbnail)}
            alt=""
            fill
            className="object-cover"
            sizes="188px"
            unoptimized
          />
          <span className="mono absolute bottom-2 right-2 bg-background/90 px-1.5 py-0.5 text-[9px] text-ink">
            {formatTimestamp(row.durationSeconds)}
          </span>
          <span
            className="mono-label absolute left-2 top-2 bg-background/90 px-1.5 py-0.5 text-[8px] text-ink opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            ⋮⋮
          </span>
        </div>
        <div className="border-t border-line p-3">
          <p className="mono-label text-[9px] text-ink-soft">
            {String(clip.voiceIndex).padStart(2, '0')} · SOURCE
          </p>
          <p className="mt-1 line-clamp-2 font-serif text-sm leading-snug text-ink">{clip.title}</p>
        </div>
      </button>
    )
  }

  if (row.item.kind === 'interlude') {
    const interlude = row.item.interlude
    return (
      <button
      type="button"
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.stopPropagation()
        onDragStart()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      className={`flex w-[168px] shrink-0 flex-col border text-left transition-colors md:w-[188px] ${
        selected
          ? 'border-mint-ink bg-mint/10 ring-1 ring-mint-ink'
          : 'border-line bg-paper-2/40 hover:border-mint-ink/50'
      } ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-mint-ink' : ''}`}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
        <AsterismMark size={28} className="text-mint-ink" compact />
        <p className="mono-label mt-4 text-[9px] text-mint-ink">WHAT EMERGES</p>
        <p className="mt-3 line-clamp-4 font-serif text-sm leading-relaxed text-ink">
          &ldquo;{truncate(interlude.text, 120)}&rdquo;
        </p>
        <p className="mono-label mt-4 text-[8px] tracking-[0.2em] text-ink-soft">EL CANTO</p>
        <span className="mono mt-3 text-[9px] text-ink-soft">
          {formatTimestamp(row.durationSeconds)}
        </span>
      </div>
      </button>
    )
  }

  return null
}
