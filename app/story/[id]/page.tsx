'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandFooter } from '@/components/brand/brand-footer'
import { Masthead } from '@/components/masthead'
import { StoryBuilder } from '@/components/story/story-builder'
import { loadStoryProject } from '@/lib/storage/story-session'
import { loadSynthesisDocument } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { StoryProject } from '@/lib/types/story-plan'

export default function StoryPage() {
  const params = useParams()
  const synthesisId = params.id as string
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)
  const [project, setProject] = useState<StoryProject | null>(null)

  useEffect(() => {
    async function load() {
      const local = loadSynthesisDocument(synthesisId)
      if (local?.result) {
        setDoc(local)
        setProject(loadStoryProject(synthesisId))
        return
      }

      try {
        const res = await fetch(`/api/synthesis/${synthesisId}`)
        if (res.ok) {
          const data = (await res.json()) as { document?: SynthesisDocument }
          if (data.document?.result) {
            setDoc(data.document)
            setProject(loadStoryProject(synthesisId))
            return
          }
        }
      } catch {
        // fall through
      }
      setDoc(null)
    }
    void load()
  }, [synthesisId])

  if (!doc) {
    return (
      <main className="min-h-screen bg-background">
        <Masthead />
        <div className="px-5 py-20 md:px-8">
          <p className="mono-label text-xs text-ink-soft">Synthesis not found</p>
          <Link href="/" className="mono-label mt-4 inline-block text-xs text-ink hover:opacity-60">
            Start a new synthesis →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <StoryBuilder synthesisId={synthesisId} document={doc} initialProject={project} />
      <BrandFooter />
    </main>
  )
}
