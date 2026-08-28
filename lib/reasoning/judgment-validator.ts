import type { JudgmentEvidenceProfile, ConfidenceCeiling } from '@/lib/reasoning/judgment-evidence-profile'
import {
  formatEvidenceStrengthLabel,
  formatSourceCoverageNote,
} from '@/lib/reasoning/judgment-evidence-profile'
import type { ReasoningJudgment } from '@/lib/reasoning/types'

export type JudgmentValidationAdjustment = {
  code: 'SOURCE_SCOPE_INFLATION' | 'CONFIDENCE_INFLATION' | 'ATTRIBUTION_LOSS' | 'CONFIDENCE_CAPPED'
  field: string
  detail: string
}

const STRONG_ASSERTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bfundamental transformation\b/gi, replacement: 'possible change' },
  { pattern: /\bfundamentally transforming\b/gi, replacement: 'may be changing' },
  { pattern: /\bfundamentally transform(s|ing)?\b/gi, replacement: 'may be changing' },
  { pattern: /\bproves\b/gi, replacement: 'suggests' },
  { pattern: /\bclearly demonstrates\b/gi, replacement: 'indicates' },
  { pattern: /\bdemonstrates\b/gi, replacement: 'suggests' },
  { pattern: /\bestablishes\b/gi, replacement: 'points toward' },
  { pattern: /\bdefinitively\b/gi, replacement: 'with limited certainty' },
  { pattern: /\bdominant\b/gi, replacement: 'prominent' },
  { pattern: /\binevitable\b/gi, replacement: 'possible' },
  { pattern: /\brevolutionary\b/gi, replacement: 'significant' },
  { pattern: /\brevolutioniz(e|es|ing)\b/gi, replacement: 'may be changing' },
  { pattern: /\bgame[- ]?changing\b/gi, replacement: 'notable' },
  { pattern: /\bredefines the landscape\b/gi, replacement: 'may shift practices' },
  { pattern: /\btransforming the\b/gi, replacement: 'changing' },
  { pattern: /\btransforms the\b/gi, replacement: 'may change' },
]

const STRONG_ASSERTION_DETECT = [
  /\bfundamental transformation\b/i,
  /\bfundamentally\b/i,
  /\bproves\b/i,
  /\bclearly demonstrates\b/i,
  /\bestablishes\b/i,
  /\bdefinitively\b/i,
  /\bdominant\b/i,
  /\binevitable\b/i,
  /\brevolutionary\b/i,
  /\brevolutioniz/i,
  /\bgame[- ]?changer/i,
  /\bredefines the landscape\b/i,
]

const HYPE_AS_FACT_PATTERNS = [
  /\b(is|are)\s+(a\s+)?(transformative|revolutionary|game[- ]?changing)\b/i,
  /\b(is|are)\s+fundamentally\b/i,
  /\bwill\s+(dominate|revolutionize|transform)\b/i,
]

const ATTRIBUTION_MARKERS = /\b(sources?|characterize|describe|present|portray|frame|argue|claim)\b/i

const ALL_SOURCES_PATTERNS = [
  /\ball (?:three |3 |the )?sources\b/gi,
  /\bacross all (?:analyzed )?sources\b/gi,
  /\bthe sources (establish|agree|show|demonstrate|prove)\b/gi,
  /\bevery source\b/gi,
  /\ball videos\b/gi,
]

function applyReplacements(text: string, replacements: Array<{ pattern: RegExp; replacement: string }>): string {
  let out = text
  for (const { pattern, replacement } of replacements) {
    out = out.replace(pattern, replacement)
  }
  return out
}

function hasStrongAssertion(text: string): boolean {
  return STRONG_ASSERTION_DETECT.some((p) => p.test(text))
}

function needsAttribution(text: string): boolean {
  return HYPE_AS_FACT_PATTERNS.some((p) => p.test(text)) && !ATTRIBUTION_MARKERS.test(text)
}

function calibrateSourceScope(text: string, profile: JudgmentEvidenceProfile): { text: string; adjusted: boolean } {
  if (profile.participatingSources >= profile.totalSources) {
    return { text, adjusted: false }
  }

  let adjusted = false
  let out = text

  const partialPhrase =
    profile.participatingSources === 1
      ? 'One of the analyzed sources'
      : `${profile.participatingSources} of the ${profile.totalSources} analyzed sources`

  for (const pattern of ALL_SOURCES_PATTERNS) {
    if (pattern.test(out)) {
      adjusted = true
      out = out.replace(/\ball (?:three |3 |the )?sources\b/gi, partialPhrase)
      out = out.replace(/\bacross all (?:analyzed )?sources\b/gi, `Across ${partialPhrase.toLowerCase()}`)
      out = out.replace(/\bthe sources (establish|agree|show|demonstrate|prove)\b/gi, `${partialPhrase} suggest`)
      out = out.replace(/\bevery source\b/gi, partialPhrase)
      out = out.replace(/\ball videos\b/gi, `${profile.participatingSources} of the ${profile.totalSources} videos`)
    }
  }

  return { text: out, adjusted }
}

function calibrateField(
  text: string,
  profile: JudgmentEvidenceProfile,
  field: string,
  adjustments: JudgmentValidationAdjustment[],
): string {
  if (!text.trim()) return text

  let out = text
  const scope = calibrateSourceScope(out, profile)
  if (scope.adjusted) {
    adjustments.push({
      code: 'SOURCE_SCOPE_INFLATION',
      field,
      detail: 'Generalized support beyond participating sources',
    })
    out = scope.text
  }

  const ceilingWeak =
    profile.confidenceCeiling === 'WEAK' || profile.confidenceCeiling === 'LOW'
  const shouldSoftenStrongLanguage =
    ceilingWeak ||
    profile.sourceCoverage !== 'FULL' ||
    profile.evidenceStrength === 'WEAK' ||
    profile.evidenceStrength === 'NONE'

  if (shouldSoftenStrongLanguage && hasStrongAssertion(out)) {
    out = applyReplacements(out, STRONG_ASSERTION_PATTERNS)
    adjustments.push({
      code: 'CONFIDENCE_INFLATION',
      field,
      detail: 'Strong assertion softened to match evidence ceiling',
    })
  }

  if (needsAttribution(out) || (profile.verifiedPropositions.some((p) => p.hypeOrInterpretive) && needsAttribution(out))) {
    const sourcePhrase =
      profile.participatingSources >= 2
        ? `${profile.participatingSources} sources characterize`
        : 'One source characterizes'
    if (!ATTRIBUTION_MARKERS.test(out)) {
      out = `${sourcePhrase} the topic in promotional terms; ${out}`
      adjustments.push({
        code: 'ATTRIBUTION_LOSS',
        field,
        detail: 'Added source attribution for interpretive framing',
      })
    }
  }

  return out
}

function capCategoricalConfidence(
  confidence: ReasoningJudgment['confidence'],
  ceiling: ConfidenceCeiling,
): ReasoningJudgment['confidence'] {
  const rank: Record<ReasoningJudgment['confidence'], number> = {
    high: 3,
    moderate: 2,
    low: 1,
  }
  const ceilingRank: Record<ConfidenceCeiling, number> = {
    HIGH: 3,
    MODERATE: 2,
    WEAK: 1,
    LOW: 1,
  }
  const maxRank = ceilingRank[ceiling]
  if (rank[confidence] <= maxRank) return confidence
  if (maxRank >= 3) return 'high'
  if (maxRank >= 2) return 'moderate'
  return 'low'
}

export function validateAndCalibrateJudgment(
  judgment: ReasoningJudgment,
  profile: JudgmentEvidenceProfile,
): { judgment: ReasoningJudgment; adjustments: JudgmentValidationAdjustment[] } {
  const adjustments: JudgmentValidationAdjustment[] = []

  const statement = calibrateField(judgment.statement, profile, 'statement', adjustments)
  const whatIsSupported = calibrateField(
    judgment.whatIsSupported,
    profile,
    'whatIsSupported',
    adjustments,
  )
  const keyReason = calibrateField(judgment.keyReason, profile, 'keyReason', adjustments)
  const whatIsUncertain = judgment.whatIsUncertain

  const capped = capCategoricalConfidence(judgment.confidence, profile.confidenceCeiling)
  if (capped !== judgment.confidence) {
    adjustments.push({
      code: 'CONFIDENCE_CAPPED',
      field: 'confidence',
      detail: `Capped from ${judgment.confidence} to ${capped} (ceiling ${profile.confidenceCeiling})`,
    })
  }

  const sourceCoverageNote = formatSourceCoverageNote(profile)
  const evidenceStrengthLabel = formatEvidenceStrengthLabel(profile)

  let coverageSummary = sourceCoverageNote
  if (profile.significantClusters > 0) {
    coverageSummary += ` · ${profile.significantClusters} verified cluster${profile.significantClusters !== 1 ? 's' : ''}`
  }
  coverageSummary += ` · ${evidenceStrengthLabel}`

  return {
    judgment: {
      ...judgment,
      statement,
      whatIsSupported,
      keyReason,
      whatIsUncertain,
      confidence: capped,
      sourceCoverageNote,
      evidenceStrengthLabel,
      supportingSourceCount: profile.participatingSources,
      totalAnalyzedSourceCount: profile.totalSources,
      coverageSummary,
    },
    adjustments,
  }
}
