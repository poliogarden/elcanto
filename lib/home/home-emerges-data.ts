import { DEMO_SYNTHESIS_MAP, RELATIONSHIP_LABELS, type MapRelationshipType } from '@/lib/home/visual-synthesis-map-model'
import { listCompleteSynthesisDocuments } from '@/lib/home/list-synthesis-documents'
import { toSynthesisViewModel } from '@/lib/synthesis/presenter'
import type { RelationshipType } from '@/lib/types/relationship'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { Voice } from '@/lib/types/voice'

export type HomeEmergesMode = 'demo' | 'awaiting' | 'result' | 'no_insight'

export type HomeVoiceRef = {
  n: number
  title: string
  thumbnail?: string
  channel?: string
}

export type HomeRelationshipBlock = {
  id: string
  type: MapRelationshipType
  label: string
  statement: string
  voices: number[]
}

export type HomeEmergesData = {
  mode: HomeEmergesMode
  isSample: boolean
  synthesisId?: string
  headline?: string
  subline?: string
  metadataLine?: string
  connectionCount: number
  voiceCount: number
  voices: HomeVoiceRef[]
  relationships: HomeRelationshipBlock[]
  statusMessage?: string
}

function sortedYoutubeIds(voices: Voice[]): string[] {
  return [...voices.map((v) => v.youtubeId)].sort()
}

function docYoutubeIds(doc: SynthesisDocument): string[] {
  return [...doc.voices.map((v) => v.voice.youtubeId)].sort()
}

function setsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

export function findMatchingSynthesisDocument(voices: Voice[]): SynthesisDocument | null {
  if (voices.length < 2) return null
  const target = sortedYoutubeIds(voices)
  for (const doc of listCompleteSynthesisDocuments()) {
    if (setsEqual(target, docYoutubeIds(doc))) return doc
  }
  return null
}

function compressStatement(text: string, max = 150): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

function mapRelationshipDisplayType(type: RelationshipType): MapRelationshipType {
  switch (type) {
    case 'agreement':
    case 'partial_agreement':
    case 'shared_topic':
      return 'shared'
    case 'disagreement':
      return 'contradiction'
    case 'structural_parallel':
      return 'parallel'
    case 'complementary':
    case 'independent':
    default:
      return 'different'
  }
}

function uniqueVoices(values: number[]): number[] {
  return [...new Set(values.filter((n) => n > 0))].sort((a, b) => a - b)
}

function buildRelationshipBlocks(view: SynthesisViewModel): HomeRelationshipBlock[] {
  const blocks: HomeRelationshipBlock[] = []

  for (const rel of [...view.meaningfulRelationships].sort((a, b) => b.strength - a.strength)) {
    if (blocks.length >= 4) break
    const type = mapRelationshipDisplayType(rel.type)
    blocks.push({
      id: rel.id,
      type,
      label: RELATIONSHIP_LABELS[type],
      statement: compressStatement(rel.explanation),
      voices: uniqueVoices([rel.fromVoice, rel.toVoice]),
    })
  }

  if (blocks.length >= 2) return blocks

  for (const item of view.editorialAgreements) {
    if (blocks.length >= 4) break
    blocks.push({
      id: item.id,
      type: 'shared',
      label: RELATIONSHIP_LABELS.shared,
      statement: compressStatement(item.whyItMatters || item.title),
      voices: uniqueVoices([item.sideA.voice, item.sideB.voice]),
    })
  }

  for (const item of view.editorialDisagreements) {
    if (blocks.length >= 4) break
    blocks.push({
      id: item.id,
      type: 'contradiction',
      label: RELATIONSHIP_LABELS.contradiction,
      statement: compressStatement(item.whyItMatters || item.title),
      voices: uniqueVoices([item.sideA.voice, item.sideB.voice]),
    })
  }

  return blocks.slice(0, 4)
}

function pickHeadline(view: SynthesisViewModel): { headline: string; subline?: string } | null {
  if (view.fourthIdea?.statement) {
    return {
      headline: view.fourthIdea.statement,
      subline: view.fourthIdea.explanation,
    }
  }
  if (view.emergentStatement?.trim()) {
    return {
      headline: view.emergentStatement,
      subline: view.theAnswer?.paragraphs[0],
    }
  }
  const finding = view.findings[0]
  if (finding?.title) {
    return {
      headline: finding.title,
      subline: finding.explanation,
    }
  }
  return null
}

function voiceRefsFromVoices(voices: Voice[]): HomeVoiceRef[] {
  return voices.map((v) => ({
    n: v.n,
    title: v.title,
    thumbnail: v.thumbnail,
    channel: v.channel,
  }))
}

function buildFromViewModel(
  view: SynthesisViewModel,
  synthesisId: string,
  voices: Voice[],
): HomeEmergesData {
  const picked = pickHeadline(view)
  const relationships = buildRelationshipBlocks(view)

  if (!picked) {
    return {
      mode: 'no_insight',
      isSample: false,
      synthesisId,
      voiceCount: voices.length,
      connectionCount: view.meaningfulRelationships.length,
      voices: voiceRefsFromVoices(voices),
      relationships,
      statusMessage: 'These sources may not strongly converge. Open the synthesis for the full analysis.',
      metadataLine: view.theAnswer?.metadataLine,
    }
  }

  const voiceWord = voices.length === 1 ? 'video' : 'videos'
  const subline =
    picked.subline ??
    `This becomes visible only when these ${voices.length} ${voiceWord} are considered together.`

  return {
    mode: 'result',
    isSample: false,
    synthesisId,
    headline: picked.headline,
    subline: compressStatement(subline, 220),
    metadataLine: view.theAnswer?.metadataLine,
    voiceCount: voices.length,
    connectionCount: view.meaningfulRelationships.length,
    voices: voiceRefsFromVoices(voices),
    relationships,
  }
}

function buildDemoEmerges(): HomeEmergesData {
  const demo = DEMO_SYNTHESIS_MAP
  return {
    mode: 'demo',
    isSample: true,
    headline: demo.insight?.statement,
    subline: demo.insight?.explanation,
    voiceCount: demo.sources.length,
    connectionCount: demo.edges.length,
    voices: demo.sources.map((s) => ({
      n: s.voiceIndex,
      title: s.title,
      thumbnail: s.thumbnail,
      channel: s.channel,
    })),
    relationships: demo.edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      label: RELATIONSHIP_LABELS[edge.type],
      statement: compressStatement(edge.explanation),
      voices: uniqueVoices([
        demo.sources.find((s) => s.id === edge.fromId)?.voiceIndex ?? 0,
        demo.sources.find((s) => s.id === edge.toId)?.voiceIndex ?? 0,
      ]),
    })),
    metadataLine: `${demo.sources.length} VOICES · ${demo.edges.length} CONNECTIONS`,
  }
}

function buildAwaitingEmerges(voices: Voice[], message: string): HomeEmergesData {
  return {
    mode: 'awaiting',
    isSample: false,
    voiceCount: voices.length,
    connectionCount: 0,
    voices: voiceRefsFromVoices(voices),
    relationships: [],
    statusMessage: message,
  }
}

export function resolveHomeEmerges(
  voices: Voice[],
  options?: { allowStoredResults?: boolean },
): HomeEmergesData {
  const allowStoredResults = options?.allowStoredResults ?? true

  if (voices.length === 0) {
    return buildDemoEmerges()
  }

  if (voices.length < 2) {
    return buildAwaitingEmerges(
      voices,
      'Add at least two videos to discover what appears between them.',
    )
  }

  if (allowStoredResults) {
    const doc = findMatchingSynthesisDocument(voices)
    if (doc) {
      const view = toSynthesisViewModel(doc)
      if (view) return buildFromViewModel(view, doc.id, voices)
    }
  }

  return buildAwaitingEmerges(
    voices,
    'Run synthesis to discover what appears between these videos.',
  )
}
