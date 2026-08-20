'use client'

import { StoryBlockCard } from '@/components/story/story-block-card'
import type { StoryBlock } from '@/lib/types/story-plan'

type Props = {
  blocks: StoryBlock[]
  onChange: (blocks: StoryBlock[]) => void
}

function reorder(blocks: StoryBlock[]): StoryBlock[] {
  return blocks.map((b, i) => ({ ...b, order: i }))
}

export function StoryBlockList({ blocks, onChange }: Props) {
  function updateBlock(id: string, patch: Partial<StoryBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function removeBlock(id: string) {
    onChange(reorder(blocks.filter((b) => b.id !== id)))
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((b) => b.id === id)
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(reorder(next))
  }

  return (
    <div className="space-y-4">
      <span className="mono-label text-[10px] text-ink-soft">STORY BLOCKS</span>
      {blocks.map((block, index) => (
        <StoryBlockCard
          key={block.id}
          block={block}
          index={index}
          onEditTop={(text) => updateBlock(block.id, { topText: text })}
          onEditBottom={(text) => updateBlock(block.id, { bottomText: text })}
          onRemove={() => removeBlock(block.id)}
          onMoveUp={index > 0 ? () => moveBlock(block.id, -1) : undefined}
          onMoveDown={index < blocks.length - 1 ? () => moveBlock(block.id, 1) : undefined}
        />
      ))}
    </div>
  )
}
