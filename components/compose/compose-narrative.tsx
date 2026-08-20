'use client'

import { useState } from 'react'
import { ComposeClipCard } from '@/components/compose/compose-clip-card'
import { ComposeClipEditor } from '@/components/compose/compose-clip-editor'
import type {
  Composition,
  CompositionClip,
  CompositionInterlude,
  CompositionSection,
} from '@/lib/types/composition'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

type TranscriptSource = {
  sourceId: string
  voiceIndex: number
  youtubeId: string
  title: string
  segments: TranscriptSegment[]
}

type Props = {
  composition: Composition
  transcripts: Record<string, TranscriptSource>
  onUpdateSection: (sectionId: string, section: CompositionSection) => void
}

export function ComposeNarrative({ composition, transcripts, onUpdateSection }: Props) {
  const [editingClip, setEditingClip] = useState<{
    sectionId: string
    itemIndex: number
    clip: CompositionClip
  } | null>(null)
  const [editingInterlude, setEditingInterlude] = useState<{
    sectionId: string
    itemIndex: number
    interlude: CompositionInterlude
  } | null>(null)

  const sections = [...composition.sections].sort((a, b) => a.order - b.order)

  function moveItem(section: CompositionSection, itemIndex: number, direction: -1 | 1) {
    const nextIndex = itemIndex + direction
    if (nextIndex < 0 || nextIndex >= section.items.length) return
    const items = [...section.items]
    const [item] = items.splice(itemIndex, 1)
    items.splice(nextIndex, 0, item)
    onUpdateSection(section.id, { ...section, items })
  }

  function removeItem(section: CompositionSection, itemIndex: number) {
    const items = section.items.filter((_, i) => i !== itemIndex)
    onUpdateSection(section.id, { ...section, items })
  }

  function updateClip(section: CompositionSection, itemIndex: number, clip: CompositionClip) {
    const items = section.items.map((item, i) =>
      i === itemIndex && item.kind === 'clip' ? { kind: 'clip' as const, clip } : item,
    )
    onUpdateSection(section.id, { ...section, items })
  }

  function updateInterlude(
    section: CompositionSection,
    itemIndex: number,
    interlude: CompositionInterlude,
  ) {
    const items = section.items.map((item, i) =>
      i === itemIndex && item.kind === 'interlude' ? { kind: 'interlude' as const, interlude } : item,
    )
    onUpdateSection(section.id, { ...section, items })
    setEditingInterlude(null)
  }

  return (
    <>
      <div className="space-y-12">
        {sections.map((section, sectionIndex) => (
          <section key={section.id} className="border-t border-line pt-10">
            <span className="mono-label text-[10px] text-ink-soft">
              {String(sectionIndex + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 font-serif text-3xl font-medium uppercase tracking-tight md:text-4xl">
              {section.title}
            </h3>
            <p className="mt-4 max-w-3xl font-serif text-lg leading-relaxed text-ink-soft">
              {section.summary}
            </p>

            <div className="mt-8 space-y-4">
              {section.items.map((item, itemIndex) =>
                item.kind === 'clip' ? (
                  <ComposeClipCard
                    key={item.clip.id}
                    clip={item.clip}
                    onEdit={() =>
                      setEditingClip({
                        sectionId: section.id,
                        itemIndex,
                        clip: item.clip,
                      })
                    }
                    onMoveUp={itemIndex > 0 ? () => moveItem(section, itemIndex, -1) : undefined}
                    onMoveDown={
                      itemIndex < section.items.length - 1
                        ? () => moveItem(section, itemIndex, 1)
                        : undefined
                    }
                    onRemove={() => removeItem(section, itemIndex)}
                  />
                ) : (
                  <article key={item.interlude.id} className="border border-line bg-paper-2 p-5">
                    <span className="mono-label text-[10px] text-ink-soft">
                      {item.interlude.kind === 'synthesis' ? 'SYNTHESIS' : 'INTERLUDE'}
                    </span>
                    {editingInterlude?.sectionId === section.id &&
                    editingInterlude.itemIndex === itemIndex ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={editingInterlude.interlude.text}
                          onChange={(e) =>
                            setEditingInterlude({
                              ...editingInterlude,
                              interlude: { ...editingInterlude.interlude, text: e.target.value },
                            })
                          }
                          rows={3}
                          className="w-full border border-line bg-transparent p-3 font-serif text-lg outline-none focus:border-ink"
                        />
                        <label className="block">
                          <span className="mono-label text-[10px] text-ink-soft">DURATION (SEC)</span>
                          <input
                            type="number"
                            min={2}
                            max={30}
                            value={editingInterlude.interlude.durationSeconds}
                            onChange={(e) =>
                              setEditingInterlude({
                                ...editingInterlude,
                                interlude: {
                                  ...editingInterlude.interlude,
                                  durationSeconds: Number(e.target.value) || 5,
                                },
                              })
                            }
                            className="mono mt-2 w-24 border border-line bg-transparent p-2 text-sm outline-none focus:border-ink"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateInterlude(section, itemIndex, editingInterlude.interlude)
                            }
                            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInterlude(null)}
                            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 font-serif text-xl leading-relaxed">{item.interlude.text}</p>
                        <p className="mono mt-2 text-[10px] text-ink-soft">
                          {item.interlude.durationSeconds}s
                        </p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingInterlude({
                                sectionId: section.id,
                                itemIndex,
                                interlude: item.interlude,
                              })
                            }
                            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(section, itemIndex)}
                            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      {editingClip && (
        <ComposeClipEditor
          clip={editingClip.clip}
          segments={transcripts[editingClip.clip.sourceId]?.segments ?? []}
          open
          onClose={() => setEditingClip(null)}
          onSave={(clip) => {
            const section = sections.find((s) => s.id === editingClip.sectionId)
            if (section) updateClip(section, editingClip.itemIndex, clip)
            setEditingClip(null)
          }}
        />
      )}
    </>
  )
}
