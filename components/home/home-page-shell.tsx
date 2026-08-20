import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/** Constrains home content to editorial width on large screens */
export function HomePageShell({ children, className = '' }: Props) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-5 md:px-6 ${className}`}>{children}</div>
  )
}
