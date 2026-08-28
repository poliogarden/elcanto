export type AnalysisCoverage = {
  transcriptDurationSeconds: number
  analyzedDurationSeconds: number
  coverageRatio: number
  sectionCount: number
  coverageSectionCount: number
  deepAnalyzedSectionCount: number
  failedSectionIds?: string[]
  transcriptCharCount?: number
  analyzedCharCount?: number
}

export type SectionKnowledge = {
  sectionId: string
  startTime: number
  endTime: number
  topic: string
  summary: string
  /** Original transcript text for the section (when available from section builder) */
  text?: string
  claims: Array<{
    id: string
    statement: string
    topic: string
    confidence: number
  }>
  entities: Array<{ id: string; name: string; type: string }>
  importanceScore: number
  noveltyScore: number
  argumentDensity: number
  evidenceDensity: number
  deepAnalyzed?: boolean
}

export type VideoKnowledgeMeta = {
  sections: SectionKnowledge[]
  coverage: AnalysisCoverage
  analysisVersion: string
  schemaVersion: string
}
