import Link from 'next/link'
import { AsterismMark } from '@/components/brand/asterism-mark'

type Props = {
  href?: string
  symbolSize?: number
  showTagline?: boolean
  tagline?: string
  className?: string
}

/** Horizontal lockup — symbol + Space Grotesk wordmark */
export function BrandLockup({
  href = '/',
  symbolSize = 36,
  showTagline = true,
  tagline = 'Read three. Understand a fourth.',
  className = '',
}: Props) {
  const wordmarkSize = Math.round(symbolSize * 0.92)
  const taglinePad = symbolSize + 12

  const inner = (
    <span className={`group inline-flex flex-col leading-none ${className}`}>
      <span className="inline-flex items-center gap-3">
        <AsterismMark size={symbolSize} className="shrink-0 text-ink" />
        <span
          className="font-[family-name:var(--font-space-grotesk)] font-medium lowercase tracking-[-0.025em] text-ink"
          style={{ fontSize: wordmarkSize }}
        >
          elcanto
        </span>
      </span>
      {showTagline && (
        <span
          className="mono-label mt-2 text-[10px] text-ink-soft md:text-[11px]"
          style={{ paddingLeft: taglinePad }}
        >
          {tagline}
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {inner}
      </Link>
    )
  }

  return inner
}
