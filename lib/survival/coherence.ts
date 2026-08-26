import type { SourceAnalysis } from '@/lib/types/source'
import type {
  ExcludedSource,
  SourceCoherenceAssessment,
  TopicCoherence,
} from '@/lib/survival/types'

export function partitionSourcesByCoherence(
  sources: SourceAnalysis[],
  coherence: TopicCoherence,
  voices: Array<{ channel: string; thumbnail?: string }>,
): {
  included: SourceAnalysis[]
  excluded: ExcludedSource[]
  assessmentBySource: Map<string, SourceCoherenceAssessment>
} {
  const assessmentBySource = new Map(
    coherence.assessments.map((a) => [a.sourceId, a]),
  )

  const included: SourceAnalysis[] = []
  const excluded: ExcludedSource[] = []

  for (const [i, source] of sources.entries()) {
    const assessment = assessmentBySource.get(source.sourceId)
    const relevance = assessment?.relevance ?? 'partial'
    const voice = voices[i]

    if (relevance === 'off_topic') {
      excluded.push({
        sourceId: source.sourceId,
        videoId: source.videoId,
        voiceIndex: source.voiceIndex,
        title: source.title,
        thumbnail: voice?.thumbnail,
        reason: assessment?.reason ?? 'Off-topic for the central question.',
      })
    } else {
      included.push(source)
    }
  }

  return { included, excluded, assessmentBySource }
}

export function ensureMinimumIncluded(
  sources: SourceAnalysis[],
  included: SourceAnalysis[],
  excluded: ExcludedSource[],
  assessmentBySource: Map<string, SourceCoherenceAssessment>,
  voices: Array<{ channel: string; thumbnail?: string }>,
  min = 2,
): { included: SourceAnalysis[]; excluded: ExcludedSource[] } {
  if (included.length >= min) {
    return { included, excluded }
  }

  const partialCandidates = sources.filter((s) => {
    const a = assessmentBySource.get(s.sourceId)
    return a?.relevance === 'partial' && !included.some((i) => i.sourceId === s.sourceId)
  })

  const nextIncluded = [...included]
  const nextExcluded = [...excluded]

  for (const source of partialCandidates) {
    if (nextIncluded.length >= min) break
    const idx = nextExcluded.findIndex((e) => e.sourceId === source.sourceId)
    if (idx >= 0) nextExcluded.splice(idx, 1)
    nextIncluded.push(source)
  }

  return { included: nextIncluded, excluded: nextExcluded }
}

/** Reject abstract disagreement labels that don't contain claim substance */
const ABSTRACT_LABEL_PATTERNS = [
  /^focus on/i,
  /^discussion/i,
  /^impact vs/i,
  /^perspective/i,
  /^viewpoint/i,
  /^approach/i,
  /^emphasis/i,
]

export function isAbstractDisagreementLabel(label: string, claimText: string): boolean {
  if (claimText && claimText.length > 20) return false
  return ABSTRACT_LABEL_PATTERNS.some((p) => p.test(label.trim()))
}
