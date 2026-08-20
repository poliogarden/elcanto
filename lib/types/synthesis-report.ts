/** Synthesis report v2 — structured layers on top of existing pipeline artifacts */

export type CrossSourceTheme = {
  id: string
  title: string
  description: string
  claimIds: string[]
  sourceIds: string[]
  importance: number
  synthesisSentence: string
  evidenceClaimIds: string[]
}

export type SynthesisFinding = {
  id: string
  title: string
  explanation: string
  kind: 'theme' | 'agreement' | 'disagreement' | 'intersection' | 'pattern' | 'unique'
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  confidence: number
}

export type EditorialComparison = {
  id: string
  kind: 'agreement' | 'disagreement'
  title: string
  sideA: {
    label: string
    voice: number
    sourceId: string
    title: string
    statement: string
    claimId: string
    thumbnail?: string
  }
  sideB: {
    label: string
    voice: number
    sourceId: string
    title: string
    statement: string
    claimId: string
    thumbnail?: string
  }
  whyItMatters: string
  relationshipId: string
  claimIds: string[]
}

export type SynthesisReportMeta = {
  version: 2
  claimCount: number
  themeCount: number
  relationshipCount: number
  findingCount: number
}
