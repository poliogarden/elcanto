import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
}

function truncateTitle(title: string, max = 48): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1)}…`
}

/** Shows which voices were compared in this synthesis */
export function SynthesisSourcesBar({ voices }: Props) {
  if (voices.length === 0) return null

  return (
    <section className="border-b border-line py-5 md:py-6">
      <span className="mono-label text-[10px] text-ink-soft">
        VOICES · {voices.length}
      </span>
      <p className="mt-2 max-w-2xl font-serif text-base text-ink-soft">
        The perspectives you brought together for this synthesis.
      </p>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {voices.map((voice) => (
          <article
            key={voice.id}
            className="flex w-[140px] shrink-0 flex-col border border-line bg-background sm:w-[160px]"
          >
            <div className="relative aspect-video w-full border-b border-line bg-paper-2">
              {voice.thumbnail ? (
                <img src={voice.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="mono text-[10px] text-ink-soft">
                    {String(voice.n).padStart(2, '0')}
                  </span>
                </div>
              )}
              {voice.duration && voice.duration !== '—' && (
                <span className="mono absolute bottom-1.5 right-1.5 bg-ink px-1 py-0.5 text-[9px] text-background">
                  {voice.duration}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <span className="mono-label text-[9px] text-ink-soft">
                VOICE {String(voice.n).padStart(2, '0')}
              </span>
              <h3 className="mt-1.5 line-clamp-2 font-serif text-sm leading-snug">
                {truncateTitle(voice.title, 56)}
              </h3>
              <p className="mono mt-1.5 truncate text-[9px] text-ink-soft">{voice.channel}</p>
              <a
                href={voice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono-label mt-2 text-[9px] text-ink hover:opacity-60"
              >
                Open on YouTube ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
