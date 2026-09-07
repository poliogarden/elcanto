import type { ChannelBrain, VideoProject } from '@/lib/creator/types'
import type { ChannelMemory } from '@/lib/creator/intelligence/types'

export type ContradictionAlert = {
  pastPositionId: string
  pastStatement: string
  pastEvidenceRef: string
  currentText: string
  confidence: 'strong' | 'moderate' | 'weak'
  videoId: string
  timestamp: number
}

export function detectContradictions(
  project: VideoProject,
  brain: ChannelBrain,
): ContradictionAlert[] {
  const scriptText = extractScriptText(project.script)
  if (!scriptText) return []

  const alerts: ContradictionAlert[] = []
  const lower = scriptText.toLowerCase()

  for (const pos of brain.positions) {
    const past = pos.statement.toLowerCase()
    const isPastSkeptic = /unsustainable|bubble|correction|cannot outpace|without a correction/i.test(past)
    const isCurrentBull = /always.{0,12}sustainable|no bubble|only upside|무조건/i.test(lower)

    if (isPastSkeptic && isCurrentBull) {
      alerts.push({
        pastPositionId: pos.id,
        pastStatement: pos.statement,
        pastEvidenceRef: pos.evidenceRef,
        currentText: scriptText.slice(0, 200),
        confidence: 'moderate',
        videoId: pos.videoId,
        timestamp: pos.timestamp,
      })
    }
  }

  return alerts
}

function extractScriptText(script: unknown): string {
  if (!script || typeof script !== 'object') return ''
  const s = script as { hook?: string; sections?: Array<{ body?: string }>; conclusion?: string }
  const parts = [s.hook ?? '', ...(s.sections ?? []).map((x) => x.body ?? ''), s.conclusion ?? '']
  return parts.join(' ')
}

export type RetrievedContext = {
  project: { id: string; topic: string; stage: string }
  topics: Array<{ id: string; label: string }>
  positions: Array<{ id: string; label: string; statement: string; evidenceRef: string }>
  openLoops: Array<{ id: string; label: string }>
  audienceQuestions: Array<{ id: string; label: string }>
  styleProfile: Record<string, unknown>
  retrievalTrace: string[]
}

export function retrieveChannelContext(input: {
  query: string
  project: VideoProject
  brain: ChannelBrain
  memory: ChannelMemory
}): RetrievedContext {
  const trace: string[] = []
  const q = input.query.toLowerCase()

  let positions = input.brain.positions
  if (/nvidia|엔비디아/i.test(q)) {
    positions = positions.filter((p) => /nvidia|gpu|data center/i.test(p.statement + p.label))
    trace.push('filter: NVIDIA topic')
  }
  if (/버블|bubble/i.test(q)) {
    positions = positions.filter((p) => /bubble|capex|unsustainable/i.test(p.statement + p.label))
    trace.push('filter: AI bubble topic')
  }
  if (positions.length === 0) positions = input.brain.positions.slice(0, 4)
  else trace.push(`positions: ${positions.length} matched`)

  const openLoops = input.brain.openLoops.slice(0, 3)
  trace.push(`openLoops: ${openLoops.length}`)

  return {
    project: { id: input.project.id, topic: input.project.topic, stage: input.project.stage },
    topics: input.brain.topics.slice(0, 4).map((t) => ({ id: t.id, label: t.label })),
    positions: positions.slice(0, 6).map((p) => ({
      id: p.id,
      label: p.label,
      statement: p.statement,
      evidenceRef: p.evidenceRef,
    })),
    openLoops: openLoops.map((l) => ({ id: l.id, label: l.label })),
    audienceQuestions: input.memory.audienceQuestions.slice(0, 3).map((a) => ({
      id: a.id,
      label: a.label,
    })),
    styleProfile: {},
    retrievalTrace: trace,
  }
}
