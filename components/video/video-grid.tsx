import type { ReactNode } from 'react'
import { VIDEO_GRID_CLASS } from '@/components/home/video-grid-skeleton'

type Props = {
  children: ReactNode
  className?: string
}

export function VideoGrid({ children, className = '' }: Props) {
  return <div className={`${VIDEO_GRID_CLASS} ${className}`}>{children}</div>
}
