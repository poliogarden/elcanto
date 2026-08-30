export type FinalDecisionCase = {
  slug: string
  label: string
  setType: 'mismatch' | 'agreement' | 'divide'
  /** Real YouTube job with cached transcripts */
  synthesisJobId?: string
  synthesisId?: string
  /** Benchmark fixture when no real job */
  fixtureId?: string
  isRealYouTube: boolean
}

export const FINAL_DECISION_CASES: FinalDecisionCase[] = [
  {
    slug: 'case-a',
    label: 'Case A — Mismatch (53% accuracy)',
    setType: 'mismatch',
    synthesisJobId: '90c1d5a2-9e6d-4619-badf-c6f89844c27f',
    synthesisId: '11edc0ee-037a-4e2d-ae83-b28c6d43efe9',
    isRealYouTube: true,
  },
  {
    slug: 'case-b',
    label: 'Case B — Genuine Agreement',
    setType: 'agreement',
    fixtureId: 'final-decision-case-b',
    isRealYouTube: false,
  },
  {
    slug: 'case-c',
    label: 'Case C — Genuine Divide',
    setType: 'divide',
    fixtureId: 'final-decision-case-c',
    isRealYouTube: false,
  },
]

export function findFinalDecisionCase(id: string): FinalDecisionCase | undefined {
  return FINAL_DECISION_CASES.find(
    (c) => c.slug === id || c.synthesisId === id || c.synthesisJobId === id,
  )
}
