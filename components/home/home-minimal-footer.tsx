'use client'

type Props = {
  className?: string
}

export function HomeMinimalFooter({ className = '' }: Props) {
  return (
    <footer className={`py-5 text-center text-[11px] text-ink-soft/50 ${className}`}>
      <span className="font-[family-name:var(--font-space-grotesk)] lowercase tracking-tight">
        elcanto
      </span>
    </footer>
  )
}
