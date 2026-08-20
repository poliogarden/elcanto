'use client'

import type { ThemeEvidenceView } from '@/lib/types/view-model'

type Props = {
  items: ThemeEvidenceView[]
  open: boolean
  onClose: () => void
  title?: string
}

export function EvidenceDrawer({ items, open, onClose, title = 'Evidence' }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <button type="button" className="flex-1" aria-label="Close evidence" onClick={onClose} />
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="mono-label text-[10px] text-ink-soft">EVIDENCE</span>
            <h3 className="mt-2 font-serif text-2xl font-medium">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mono-label border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
          >
            Close
          </button>
        </div>

        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.claimId} className="border border-line p-4">
              <div className="flex gap-3">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="h-12 w-20 shrink-0 border border-line object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="mono text-[10px] text-ink-soft">
                    SOURCE {String(item.voice).padStart(2, '0')}
                  </p>
                  <p className="mt-1 font-serif text-sm font-medium leading-snug">{item.sourceTitle}</p>
                </div>
              </div>
              <blockquote className="mt-4 border-l-2 border-mint pl-4 font-serif text-base leading-relaxed text-ink-soft">
                &ldquo;{item.statement}&rdquo;
              </blockquote>
              {item.watchUrl && (
                <a
                  href={item.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mono mt-4 inline-block text-[11px] underline hover:text-ink"
                >
                  {item.timestamp ? `Jump to ${item.timestamp}` : 'Open source'}
                </a>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
