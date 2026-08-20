import type { Voice } from '@/lib/types/voice'
import { VoiceThumb } from './voice-thumb'

type VoiceIndexProps = {
  voices: Voice[]
  onRemove?: (id: string) => void
}

function statusLabel(status: Voice['status']): string {
  switch (status) {
    case 'fetching_metadata':
      return 'fetching'
    case 'fetching_transcript':
      return 'fetching transcript'
    case 'analyzing':
      return 'analyzing'
    case 'failed':
      return 'failed'
    case 'done':
      return 'done'
    default:
      return 'ready'
  }
}

export function VoiceIndex({ voices, onRemove }: VoiceIndexProps) {
  if (voices.length === 0) return null

  return (
    <div className="border-b border-line">
      <div className="border-b border-line px-5 py-4 md:px-8">
        <span className="mono-label text-[10px] text-ink-soft">ON THE DESK</span>
      </div>
      {voices.map((v) => (
        <article
          key={v.id}
          className="grid grid-cols-[auto_1fr] items-start gap-4 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[3rem_9rem_1fr_auto] md:items-center md:gap-6 md:px-8"
        >
          <span className="mono pt-1 text-sm text-ink-soft md:pt-0">
            {String(v.n).padStart(2, '0')}
          </span>

          <div className="row-span-2 hidden md:block">
            <VoiceThumb n={v.n} duration={v.duration !== '—' ? v.duration : undefined} />
          </div>

          <div className="min-w-0">
            <h3 className="font-serif text-lg leading-tight text-balance md:text-xl">
              {v.title || 'Fetching metadata…'}
            </h3>
            <div className="mono mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
              <span>{v.channel || '—'}</span>
              {v.duration !== '—' && (
                <>
                  <span aria-hidden>·</span>
                  <span>{v.duration}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span
                className={`uppercase tracking-widest ${
                  v.status === 'failed' ? 'text-destructive' : 'text-ink'
                }`}
              >
                {statusLabel(v.status)}
              </span>
            </div>
            {v.error && (
              <p className="mono mt-2 text-[11px] text-destructive">{v.error}</p>
            )}
          </div>

          {onRemove && (
            <div className="col-start-2 md:col-start-4">
              <button
                type="button"
                onClick={() => onRemove(v.id)}
                className="mono-label border border-line px-3 py-2 text-[10px] text-ink-soft transition-colors hover:bg-ink hover:text-background"
              >
                Remove
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
