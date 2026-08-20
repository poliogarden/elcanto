type Props = {
  size?: number
  className?: string
  animate?: boolean
  /** Simplified mark for 16–32px favicon sizes */
  compact?: boolean
}

/** Direction 03 · Asterism — primary mark from elcanto Identity System */
export function AsterismMark({ size = 48, className = '', animate = false, compact = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={`${animate ? 'compose-asterism-pulse' : ''} ${className}`}
      aria-hidden
    >
      <circle cx="100" cy="100" r="82" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="100" cy="58" r="4.2" fill="currentColor" />
      <circle cx="66" cy="118" r="4.2" fill="currentColor" />
      <circle cx="134" cy="118" r="4.2" fill="currentColor" />
      {!compact && (
        <>
          <path
            d="M 100 58 L 66 118 L 134 118 Z"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.55"
          />
          <path d="M 100 98 L 148 60" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        </>
      )}
      <circle cx="148" cy="60" r={compact ? 5.5 : 6} fill="currentColor" />
    </svg>
  )
}
