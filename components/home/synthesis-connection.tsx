'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { Voice } from '@/lib/types/voice'

export type SynthesisConnectionState = 'ready' | 'processing' | 'complete'

type Point = { x: number; y: number }

type Props = {
  voices: Voice[]
  state?: SynthesisConnectionState
  workspaceRef: React.RefObject<HTMLElement | null>
}

function collectAnchors(container: HTMLElement): Point[] {
  const containerRect = container.getBoundingClientRect()
  const nodes = container.querySelectorAll('[data-synthesis-anchor]')
  return Array.from(nodes).map((el) => {
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    }
  })
}

export function SynthesisConnection({
  voices,
  state = 'ready',
  workspaceRef,
}: Props) {
  const { t } = useTranslation()
  const [layout, setLayout] = useState<{
    width: number
    height: number
    paths: string[]
    nodeY: number
  }>({ width: 0, height: 0, paths: [], nodeY: 0 })

  const measure = useCallback(() => {
    const container = workspaceRef.current
    if (!container || voices.length === 0) {
      setLayout({ width: 0, height: 0, paths: [], nodeY: 0 })
      return
    }

    const width = container.clientWidth
    const anchors = collectAnchors(container)
    if (anchors.length === 0) return

    const maxAnchorY = Math.max(...anchors.map((a) => a.y))
    const nodeX = width / 2
    const nodeY = maxAnchorY + (voices.length === 1 ? 56 : 72)
    const height = nodeY + 8

    const paths = anchors.map((start) => {
      const midY = start.y + (nodeY - start.y) * 0.55
      return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${nodeX} ${midY}, ${nodeX} ${nodeY - 18}`
    })

    setLayout({ width, height, paths, nodeY })
  }, [workspaceRef, voices.length])

  useEffect(() => {
    measure()
    const container = workspaceRef.current
    if (!container) return

    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, workspaceRef, voices])

  if (voices.length === 0 || layout.width === 0) return null

  const active = state !== 'ready'
  const strokeColor = active ? 'var(--coral)' : 'var(--coral-line)'

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible"
      style={{ height: layout.height }}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t('home.whatEmerges')}
    >
      {layout.paths.map((d, i) => (
        <path
          key={voices[i]?.id ?? i}
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          strokeLinecap="round"
          opacity={active ? 0.9 : 0.65}
          strokeDasharray={state === 'processing' ? '4 4' : undefined}
          className={state === 'processing' ? 'synthesis-line-dash' : undefined}
        />
      ))}
    </svg>
  )
}

type NodeProps = {
  state?: SynthesisConnectionState
}

export function SynthesisEmergenceNode({ state = 'ready' }: NodeProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full border bg-background ${
          state === 'complete'
            ? 'border-coral bg-coral/5'
            : state === 'processing'
              ? 'border-coral/60'
              : 'border-coral/80'
        }`}
        aria-hidden
      >
        <span className="font-serif text-xl italic text-ink-soft">
          {state === 'processing' ? '···' : state === 'complete' ? '●' : '?'}
        </span>
      </div>
      <p className="mono-label mt-3 text-[10px] tracking-[0.14em] text-ink-soft">
        {t('home.whatEmerges')}
      </p>
    </div>
  )
}
