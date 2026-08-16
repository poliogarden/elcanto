import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { formatTotalDuration } from '@/lib/youtube/url'
import { formatTimestamp, voiceIdFromIndex, youtubeWatchUrl } from '@/lib/youtube/timestamp'

const SUGGESTED_QUESTIONS = [
  'What do they all agree on?',
  'Where do they disagree most?',
  'What did only a few people notice?',
  "What's the overall conclusion?",
  'Which argument has the strongest evidence?',
  'Give me the strongest argument from each side.',
]

function parseVoiceIndices(ids: string[]): number[] {
  return ids
    .map((id) => {
      const match = id.match(/(\d+)/)
      return match ? Number(match[1]) : null
    })
    .filter((n): n is number => n !== null)
}

export function toSynthesisViewModel(doc: SynthesisDocument): SynthesisViewModel | null {
  if (!doc.result) return null

  const result = doc.result
  const readyVoices = doc.voices.filter((v) => v.analysis && !v.error)
  const voiceByYoutubeId = new Map(readyVoices.map((v) => [v.voice.youtubeId, v.voice]))
  const voiceByIndex = new Map(readyVoices.map((v) => [v.voice.n, v.voice]))

  const consensus = result.consensus.map((c, i) => ({
    index: `${String(i + 1).padStart(2, '0')} / CONSENSUS`,
    agreeCount: c.supportingVoiceIds.length,
    total: readyVoices.length,
    claim: c.claim,
    voices: parseVoiceIndices(c.supportingVoiceIds),
  }))

  const firstDisagreement = result.disagreements[0]
  const disagreement = firstDisagreement
    ? {
        question: firstDisagreement.question,
        yes: {
          label: firstDisagreement.sides[0]?.label ?? 'YES',
          count: firstDisagreement.sides[0]?.voiceIds.length ?? 0,
          summary: firstDisagreement.sides[0]?.summary ?? '',
          voices: parseVoiceIndices(firstDisagreement.sides[0]?.voiceIds ?? []),
        },
        no: {
          label: firstDisagreement.sides[1]?.label ?? 'NO',
          count: firstDisagreement.sides[1]?.voiceIds.length ?? 0,
          summary: firstDisagreement.sides[1]?.summary ?? '',
          voices: parseVoiceIndices(firstDisagreement.sides[1]?.voiceIds ?? []),
        },
      }
    : null

  const firstMinority = result.minorityInsights[0]
  const minority = firstMinority
    ? {
        mentionedBy: firstMinority.mentionedBy,
        total: firstMinority.total,
        claim: firstMinority.claim,
        detail: firstMinority.detail,
      }
    : null

  const evidenceMap = new Map<string, { text: string; timestamp: number }>()
  for (const entry of readyVoices) {
    if (!entry.analysis) continue
    for (const ev of entry.analysis.evidence) {
      evidenceMap.set(`${entry.voice.youtubeId}:${ev.id}`, {
        text: ev.text,
        timestamp: ev.timestamp,
      })
    }
  }

  const evidence: SynthesisViewModel['evidence'] = []
  for (const entry of readyVoices) {
    if (!entry.analysis) continue
    for (const ev of entry.analysis.evidence.slice(0, 2)) {
      evidence.push({
        voice: entry.voice.n,
        youtubeId: entry.voice.youtubeId,
        title: entry.voice.title,
        timestamp: formatTimestamp(ev.timestamp),
        excerpt: `"${ev.text}"`,
        watchUrl: youtubeWatchUrl(entry.voice.youtubeId, ev.timestamp),
      })
    }
  }

  const bottomLineParagraphs = result.bottomLine
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const date = new Date(doc.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()

  return {
    id: doc.id,
    number: doc.number,
    question: result.topic,
    voiceCount: doc.voices.length,
    readyVoiceCount: readyVoices.length,
    totalDuration: formatTotalDuration(doc.voices.map((v) => v.voice)),
    date,
    bottomLineLabel: 'THE BOTTOM LINE',
    bottomLineHeadline:
      result.bottomLineHeadline ??
      result.overallConclusion.split(' ').reduce<string[]>((lines, word) => {
        const last = lines[lines.length - 1] ?? ''
        if (!last || (last + ' ' + word).length > 28) lines.push(word)
        else lines[lines.length - 1] = last + ' ' + word
        return lines
      }, []).slice(0, 3),
    bottomLine: bottomLineParagraphs.length > 0 ? bottomLineParagraphs : [result.bottomLine],
    consensus,
    disagreement,
    minority,
    evidence: evidence.slice(0, 8),
    voices: doc.voices.map((v) => v.voice),
    suggestedQuestions: SUGGESTED_QUESTIONS,
  }
}

export function voiceIndexToYoutubeId(doc: SynthesisDocument, voiceIndex: number): string | null {
  const entry = doc.voices.find((v) => v.voice.n === voiceIndex)
  return entry?.voice.youtubeId ?? null
}

export { voiceIdFromIndex }
