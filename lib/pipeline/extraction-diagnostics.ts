import type { SectionKnowledge } from '@/lib/types/video-knowledge'

export type EmptyClaimSectionReason =
  | 'NO_PROPOSITION'
  | 'EXTRACTION_MISS'
  | 'FILTERED_BY_SCHEMA'
  | 'MODEL_RETURNED_EMPTY'
  | 'PARSER_FAILURE'
  | 'OTHER'

export type PropositionType =
  | 'definition'
  | 'mechanism'
  | 'comparison'
  | 'cause'
  | 'effect'
  | 'advantage'
  | 'limitation'
  | 'observation'
  | 'market_implication'
  | 'other'

export type EmptyClaimSectionDiagnostic = {
  sectionId: string
  sourceId: string
  startTime: number
  endTime: number
  topic: string
  summarySnippet: string
  reason: EmptyClaimSectionReason
  argumentDensity: number
  evidenceDensity: number
  importanceScore: number
}

export type PropositionTypeCoverage = {
  type: PropositionType
  detectedEvidenceSections: number
  extractedClaims: number
  missedSections: string[]
}

export type ExtractionCoverageDiagnostics = {
  meaningfulSections: number
  sectionsWithClaims: number
  emptyMeaningfulSections: number
  coverageRatio: number
  emptyClaimSections: EmptyClaimSectionDiagnostic[]
  propositionTypeCoverage: PropositionTypeCoverage[]
  warnings: Array<{
    code: 'EMPTY_CLAIM_SECTION'
    message: string
    sectionId: string
    sourceId: string
    reason: EmptyClaimSectionReason
  }>
}

const PLACEHOLDER_SECTION =
  /introduces the topic but does not provide|does not convey any meaningful|merely mentioning|does not provide detailed information|no meaningful content/i

const PROPOSITION_PATTERNS: Record<PropositionType, RegExp> = {
  definition: /\b(is|are|means|defines|refers to|known as|stands for|what .+ is)\b/i,
  mechanism: /\b(works? by|enables?|allows?|connects?|integrat|protocol|standard|interface|workflow)\b/i,
  comparison:
    /\b(more|less|faster|slower|easier|harder|compared|versus|vs\.?|unlike|instead of|rather than|than .+ api)\b/i,
  cause: /\b(because|due to|leads to|results in|enabled|attributable|as a result|therefore)\b/i,
  effect: /\b(impact|effect|consequence|outcome|adoption|spread|growth|change)\b/i,
  advantage: /\b(advantage|benefit|strength|superior|better|simplif|reduces? complexity)\b/i,
  limitation: /\b(limitation|drawback|weakness|cannot|unable|does not|fails to|lack)\b/i,
  observation: /\b(observ|notice|see|found|discuss|mention|highlight|suggest)\b/i,
  market_implication: /\b(market|industry|ecosystem|adoption|dominat|trend|demand)\b/i,
  other: /./,
}

function sectionText(section: SectionKnowledge): string {
  return (section.text?.trim() ? section.text : section.summary).trim()
}

export function isPlaceholderSectionContent(text: string): boolean {
  return PLACEHOLDER_SECTION.test(text) || text.trim().length < 24
}

export function isMeaningfulSection(section: SectionKnowledge): boolean {
  const text = sectionText(section)
  if (isPlaceholderSectionContent(text)) return false
  if (section.claims.length > 0) return true
  return (
    section.argumentDensity >= 0.32 ||
    section.evidenceDensity >= 0.32 ||
    section.importanceScore >= 0.42 ||
    /\b(api|mcp|integrat|tool|protocol|deploy|llm|application)\b/i.test(text)
  )
}

export function inferPropositionTypes(text: string): PropositionType[] {
  const types: PropositionType[] = []
  for (const [type, pattern] of Object.entries(PROPOSITION_PATTERNS)) {
    if (type === 'other') continue
    if (pattern.test(text)) types.push(type as PropositionType)
  }
  return types.length > 0 ? types : ['other']
}

export function classifyEmptySectionReason(
  section: SectionKnowledge,
  failedSectionIds: string[],
): EmptyClaimSectionReason {
  if (failedSectionIds.includes(section.sectionId)) return 'PARSER_FAILURE'
  const text = sectionText(section)
  if (isPlaceholderSectionContent(text)) return 'NO_PROPOSITION'
  if (section.argumentDensity < 0.15 && section.evidenceDensity < 0.15) return 'NO_PROPOSITION'
  return 'EXTRACTION_MISS'
}

export function buildExtractionCoverageDiagnostics(input: {
  sourceId: string
  sections: SectionKnowledge[]
  failedSectionIds?: string[]
}): ExtractionCoverageDiagnostics {
  const failed = input.failedSectionIds ?? []
  const meaningful = input.sections.filter(isMeaningfulSection)
  const withClaims = input.sections.filter((s) => s.claims.length > 0)
  const emptyMeaningful = meaningful.filter((s) => s.claims.length === 0)

  const emptyClaimSections: EmptyClaimSectionDiagnostic[] = emptyMeaningful.map((s) => ({
    sectionId: s.sectionId,
    sourceId: input.sourceId,
    startTime: s.startTime,
    endTime: s.endTime,
    topic: s.topic,
    summarySnippet: sectionText(s).slice(0, 120),
    reason: classifyEmptySectionReason(s, failed),
    argumentDensity: s.argumentDensity,
    evidenceDensity: s.evidenceDensity,
    importanceScore: s.importanceScore,
  }))

  const warnings = emptyClaimSections
    .filter((d) => d.reason === 'EXTRACTION_MISS' || d.reason === 'MODEL_RETURNED_EMPTY')
    .map((d) => ({
      code: 'EMPTY_CLAIM_SECTION' as const,
      message: `EMPTY_CLAIM_SECTION: ${input.sourceId}/${d.sectionId} (${d.reason})`,
      sectionId: d.sectionId,
      sourceId: input.sourceId,
      reason: d.reason,
    }))

  const propositionTypeCoverage: PropositionTypeCoverage[] = (
    Object.keys(PROPOSITION_PATTERNS) as PropositionType[]
  )
    .filter((t) => t !== 'other')
    .map((type) => {
      const detectedSections = meaningful.filter((s) =>
        inferPropositionTypes(sectionText(s)).includes(type),
      )
      const missedSections = detectedSections
        .filter((s) => s.claims.length === 0)
        .map((s) => s.sectionId)
      const extractedClaims = detectedSections.reduce((n, s) => n + s.claims.length, 0)
      return {
        type,
        detectedEvidenceSections: detectedSections.length,
        extractedClaims,
        missedSections,
      }
    })

  return {
    meaningfulSections: meaningful.length,
    sectionsWithClaims: withClaims.length,
    emptyMeaningfulSections: emptyMeaningful.length,
    coverageRatio:
      meaningful.length > 0 ? withClaims.filter((s) => isMeaningfulSection(s)).length / meaningful.length : 1,
    emptyClaimSections,
    propositionTypeCoverage,
    warnings,
  }
}

export function aggregateExtractionCoverage(
  perSource: ExtractionCoverageDiagnostics[],
): ExtractionCoverageDiagnostics {
  const meaningfulSections = perSource.reduce((n, s) => n + s.meaningfulSections, 0)
  const sectionsWithClaims = perSource.reduce((n, s) => n + s.sectionsWithClaims, 0)
  const emptyMeaningfulSections = perSource.reduce((n, s) => n + s.emptyMeaningfulSections, 0)

  const typeMap = new Map<PropositionType, PropositionTypeCoverage>()
  for (const src of perSource) {
    for (const row of src.propositionTypeCoverage) {
      const existing = typeMap.get(row.type)
      if (!existing) {
        typeMap.set(row.type, { ...row, missedSections: [...row.missedSections] })
      } else {
        existing.detectedEvidenceSections += row.detectedEvidenceSections
        existing.extractedClaims += row.extractedClaims
        existing.missedSections.push(...row.missedSections)
      }
    }
  }

  return {
    meaningfulSections,
    sectionsWithClaims,
    emptyMeaningfulSections,
    coverageRatio:
      meaningfulSections > 0
        ? (meaningfulSections - emptyMeaningfulSections) / meaningfulSections
        : 1,
    emptyClaimSections: perSource.flatMap((s) => s.emptyClaimSections),
    propositionTypeCoverage: [...typeMap.values()],
    warnings: perSource.flatMap((s) => s.warnings),
  }
}
