import type { SynthesisViewModel } from '@/lib/types/view-model'

export type ShapedRelationship = {
  id: string
  category: 'shared' | 'different' | 'contradiction' | 'emerges'
  symbol: string
  label: string
  statement: string
  voices: number[]
}

export function getHeroStatement(view: SynthesisViewModel): string {
  if (view.fourthIdea?.statement) return view.fourthIdea.statement
  if (view.emergentStatement) return view.emergentStatement
  if (view.insights.length > 0) {
    const best = [...view.insights].sort((a, b) => {
      const score = (i: (typeof view.insights)[number]) =>
        i.confidence * 0.6 + i.noveltyScore * 0.4
      return score(b) - score(a)
    })[0]
    return best.statement
  }
  return view.bottomLineHeadline.join(' ') || view.bottomLine[0] || ''
}

export function hasStrongEmergence(view: SynthesisViewModel): boolean {
  const statement = getHeroStatement(view)
  if (!statement) return false
  return !view.noStrongRelationship && !view.noStrongIntersection
}

export function formatSourceMetaLine(view: SynthesisViewModel): string {
  const parts = [`${view.readyVoiceCount} VIDEO${view.readyVoiceCount === 1 ? '' : 'S'}`]
  if (view.totalDuration) parts.push(view.totalDuration.toUpperCase())
  const claims = view.inspectStats.claimsExtracted
  if (claims > 0) parts.push(`${claims} CLAIMS`)
  return parts.join(' · ')
}

export function formatSupportLine(view: SynthesisViewModel): string | null {
  const fi = view.fourthIdea
  if (fi && fi.voices.length > 0) {
    return `${fi.voices.length} voice${fi.voices.length === 1 ? '' : 's'} support this pattern`
  }
  if (view.meaningfulRelationships.length > 0) {
    const voices = new Set(
      view.meaningfulRelationships.flatMap((r) => [r.fromVoice, r.toVoice]),
    )
    return `${voices.size} voices shaped this reading`
  }
  return null
}

function relCategory(
  type: string,
): 'shared' | 'different' | 'contradiction' | null {
  if (type === 'agreement' || type === 'partial_agreement' || type === 'complementary') {
    return 'shared'
  }
  if (type === 'disagreement') return 'different'
  if (type === 'contradiction') return 'contradiction'
  return null
}

export function getTopShapedRelationships(
  view: SynthesisViewModel,
  limit = 3,
): ShapedRelationship[] {
  const results: ShapedRelationship[] = []
  const seen = new Set<string>()

  function push(item: ShapedRelationship) {
    if (seen.has(item.id) || results.length >= limit) return
    seen.add(item.id)
    results.push(item)
  }

  for (const a of view.editorialAgreements) {
    push({
      id: `agree-${a.id}`,
      category: 'shared',
      symbol: '=',
      label: 'SHARED',
      statement: a.title,
      voices: [a.sideA.voice, a.sideB.voice],
    })
  }

  for (const d of view.editorialDisagreements) {
    push({
      id: `disagree-${d.id}`,
      category: 'different',
      symbol: '≠',
      label: 'DIFFERENT',
      statement: d.title,
      voices: [d.sideA.voice, d.sideB.voice],
    })
  }

  for (const c of view.contradictions) {
    push({
      id: `contradict-${c.id}`,
      category: 'contradiction',
      symbol: '⚡',
      label: 'CONTRADICTION',
      statement: c.description,
      voices: c.voices,
    })
  }

  for (const r of view.meaningfulRelationships) {
    const cat = relCategory(r.type)
    if (!cat) continue
    push({
      id: r.id,
      category: cat,
      symbol: cat === 'shared' ? '=' : cat === 'different' ? '≠' : '⚡',
      label: cat === 'shared' ? 'SHARED' : cat === 'different' ? 'DIFFERENT' : 'CONTRADICTION',
      statement: r.explanation || r.fromClaim,
      voices: [r.fromVoice, r.toVoice],
    })
  }

  if (view.fourthIdea && results.length < limit) {
    push({
      id: 'emerges-hero',
      category: 'emerges',
      symbol: '✦',
      label: 'EMERGES',
      statement: view.fourthIdea.statement,
      voices: view.fourthIdea.voices,
    })
  }

  return results.slice(0, limit)
}

export function getWeakResultMessage(view: SynthesisViewModel): {
  headline: string
  subline: string
  cta: 'differences' | 'explore' | 'ask'
} | null {
  if (hasStrongEmergence(view)) return null

  if (view.editorialDisagreements.length > 0 || view.contradictions.length > 0) {
    return {
      headline: "These videos don't strongly converge.",
      subline: `But they reveal ${view.editorialDisagreements.length + view.contradictions.length} important disagreement${view.editorialDisagreements.length + view.contradictions.length === 1 ? '' : 's'}.`,
      cta: 'differences',
    }
  }

  if (view.noStrongRelationship) {
    return {
      headline: 'These videos mostly stand apart.',
      subline: 'No meaningful shared pattern found — explore each perspective or ask across them.',
      cta: 'explore',
    }
  }

  return {
    headline: "These videos don't strongly converge.",
    subline: 'No strong emergent insight found — and that is a valid result.',
    cta: 'explore',
  }
}
