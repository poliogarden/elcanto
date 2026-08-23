import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/** Constrains home content width on large screens */
export function HomePageShell({ children, className = '' }: Props) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 ${className}`}>{children}</div>
  )
}
