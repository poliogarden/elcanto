'use client'

import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  className?: string
}

export function VideoSection({ title, children, className = '' }: Props) {
  return (
    <section className={`mt-8 first:mt-5 ${className}`.trim()}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
