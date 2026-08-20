import { NextResponse } from 'next/server'
import { buildComposeSourceContexts } from '@/lib/compose/build-compose-input'
import { createCompositionDocument, runComposeEngine } from '@/lib/compose/compose-engine'
import { buildMockComposition } from '@/lib/compose/mock-composition'
import type { CompositionDocument } from '@/lib/types/composition'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export const maxDuration = 180

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      document?: SynthesisDocument
      instruction?: string
    }

    if (!body.document?.result) {
      return NextResponse.json({ error: 'Complete synthesis document required.' }, { status: 400 })
    }

    const doc = body.document
    const composeDoc = createCompositionDocument(doc.id, doc)
    composeDoc.status = 'composing'
    composeDoc.instruction = body.instruction

    const sources = await buildComposeSourceContexts(doc)

    if (sources.length === 0) {
      return NextResponse.json(
        { error: 'No analyzed sources with transcripts available.' },
        { status: 400 },
      )
    }

    let composition
    try {
      composition = await runComposeEngine({
        document: doc,
        sources,
        instruction: body.instruction,
      })
    } catch {
      composition = buildMockComposition(doc, sources)
    }

    const ready: CompositionDocument = {
      ...composeDoc,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      composition,
    }

    return NextResponse.json({ document: ready })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Composition failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
