'use client'

import { useEffect, useRef, useState } from 'react'
import type { KnowledgeExtension } from '@/lib/types/knowledge'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { saveSynthesisDocument } from '@/lib/storage/synthesis-session'

export type KnowledgeExtensionStatus = 'idle' | 'loading' | 'loaded' | 'skipped' | 'error'

export function useDeferredKnowledgeExtension(
  document: SynthesisDocument | null,
  onUpdated?: (doc: SynthesisDocument) => void,
): { status: KnowledgeExtensionStatus } {
  const started = useRef(false)
  const [status, setStatus] = useState<KnowledgeExtensionStatus>('idle')

  useEffect(() => {
    started.current = false
    setStatus('idle')
  }, [document?.id])

  useEffect(() => {
    if (!document?.result) return

    const knowledge = document.result.knowledge
    const hasExtension =
      (knowledge.gaps?.length ?? 0) > 0 || (knowledge.recommendations?.length ?? 0) > 0

    if (hasExtension) {
      setStatus('skipped')
      return
    }

    if (started.current) return

    const sources = document.voices
      .map((v) => v.analysis)
      .filter((a): a is NonNullable<typeof a> => Boolean(a))

    if (sources.length < 1) return

    started.current = true
    setStatus('loading')

    void (async () => {
      try {
        const res = await fetch('/api/synthesis/knowledge-extension', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sources,
            setAnalysis: document.result!.setAnalysis,
            synthesis: document.result,
            synthesisId: document.id,
          }),
        })

        if (!res.ok) {
          setStatus('error')
          return
        }

        const data = (await res.json()) as { knowledge?: KnowledgeExtension }
        if (!data.knowledge) {
          setStatus('error')
          return
        }

        const updated: SynthesisDocument = {
          ...document,
          result: {
            ...document.result!,
            knowledge: {
              ...document.result!.knowledge,
              gaps: data.knowledge.gaps,
              recommendations: data.knowledge.recommendations,
              rejectedInsights: [
                ...document.result!.knowledge.rejectedInsights,
                ...data.knowledge.rejectedInsights,
              ],
            },
          },
        }

        saveSynthesisDocument(updated)
        onUpdated?.(updated)
        setStatus('loaded')
      } catch {
        setStatus('error')
      }
    })()
  }, [document, onUpdated])

  return { status }
}
