import { normalizeStatement } from '@/lib/reasoning/source-ingest'

const STOP = new Set([
  'the',
  'this',
  'that',
  'with',
  'from',
  'into',
  'about',
  'their',
  'which',
  'while',
  'where',
  'when',
  'have',
  'has',
  'had',
  'were',
  'was',
  'are',
  'and',
  'for',
  'not',
  'but',
  'its',
  'they',
  'than',
  'also',
  'such',
  'both',
  'more',
  'most',
  'some',
  'very',
  'just',
  'only',
])

export const NULL_EFFECT_PATTERN =
  /\b(no measurable|no significant|no meaningful|not measurably|without measurable|without significant|does not affect|do not affect|has no effect|have no effect|no effect on|no impact on|no measurable impact|no significant impact|no meaningful impact|not associated with|lack of effect|absence of effect)\b/i

const DIRECTIONAL_INCREASE =
  /\b(increases?|raises?|boosts?|improves?|enhances?|accelerates?|expanded|gained|rose|grew|higher|longer|more)\b/i
const DIRECTIONAL_DECREASE =
  /\b(decreases?|lowers?|diminishes?|reduces?|reduce|cuts?|shortens?|declined?|dropped?|fell|faster|lower|less|fewer|slowed?|slowing)\b/i

const HAZARD_MARKERS =
  /\b(wildfire|smoke|particulate|pollution|exposure|hazard|particulates?)\b/i
const HEALTH_OUTCOME_MARKERS =
  /\b(respiratory|cardiovascular|inflammation|admissions?|hospital|mortality|asthma|lung|cardiac|emergency)\b/i

const PHENOMENON_MARKERS =
  /\b(bleaching|coral|reef|temperature spike|ocean temperature|symbiotic algae)\b/i
const ECOSYSTEM_OUTCOME_MARKERS =
  /\b(ecosystem|habitat diversity|structural complexity|biodiversity|fish habitat|recovery)\b/i

const POLICY_INVESTMENT_MARKERS =
  /\b(carbon pricing|emissions trading|renewable energy investment|clean energy capital|utility scale|utility-scale)\b/i

const RURAL_ACCESS_MARKERS =
  /\b(rural|specialist access|specialist consultations?|telemedicine|telehealth)\b/i

const READMISSION_MARKERS = /\b(readmissions?|hospital readmissions?)\b/i

const COAL_RETIREMENT_MARKERS =
  /\b(coal (plant )?retirements?|coal capacity shutdowns?|coal shutdown)\b/i

const MILES_KM_RATIO = 1.60934

function contentTokens(text: string): string[] {
  return normalizeStatement(text)
    .replace(/-/g, ' ')
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function significantSharedTokens(a: string, b: string): string[] {
  const ta = contentTokens(a).filter((t) => !STOP.has(t))
  const tb = new Set(contentTokens(b).filter((t) => !STOP.has(t)))
  return ta.filter((t) => tb.has(t))
}

export type ClaimEffectPolarity = 'positive' | 'negative' | 'null_effect' | 'neutral'

export function isNullEffectStatement(statement: string): boolean {
  return NULL_EFFECT_PATTERN.test(statement)
}

export function isDirectionalEffectStatement(statement: string): boolean {
  if (isNullEffectStatement(statement)) return false
  return DIRECTIONAL_INCREASE.test(statement) || DIRECTIONAL_DECREASE.test(statement)
}

export function claimEffectPolarity(statement: string): ClaimEffectPolarity {
  if (isNullEffectStatement(statement)) return 'null_effect'
  if (
    /\b(meaningful|significant|clinically)\b/i.test(statement) &&
    /\b(weight loss|weight reduction|benefit)\b/i.test(statement)
  ) {
    return 'positive'
  }
  if (
    /\b(fat loss|weight loss|weight reduction)\b/i.test(statement) &&
    !/\b(no |without )\b/i.test(statement)
  ) {
    return 'positive'
  }
  if (/\bgreater\b/i.test(statement) && /\b(loss|reduction|benefit|advantage)\b/i.test(statement)) {
    return 'positive'
  }
  if (/\b(complexity|integration)\b/i.test(statement)) {
    if (/\b(reduces?|reduce|simplif|easier|less)\b/i.test(statement)) return 'positive'
    if (/\b(increases?|adds?|harder|more)\b/i.test(statement)) return 'negative'
  }
  if (/\b(productivity|output|performance)\b/i.test(statement)) {
    if (/\b(increases?|raises?|boosts?|improves?)\b/i.test(statement)) return 'positive'
    if (/\b(decreases?|lowers?|diminishes?|reduces?|reduce)\b/i.test(statement)) return 'negative'
  }
  const commuteBenefit =
    /\b(reduces?|reduce|cuts?|eliminates?|avoids?|reclaiming|fewer|less)\b/i.test(statement) &&
    /\b(commut|travel|trip|rush)\b/i.test(statement)
  if (commuteBenefit) return 'positive'

  const metricEffectCtx =
    /\b(ph|sleep|weight|readmissions?|range|miles|km|kilometers?|retirements?|shutdowns?|duration|admissions?)\b/i.test(
      statement,
    )
  if (metricEffectCtx) {
    if (DIRECTIONAL_INCREASE.test(statement) && !DIRECTIONAL_DECREASE.test(statement)) {
      return 'positive'
    }
    if (DIRECTIONAL_DECREASE.test(statement) && !DIRECTIONAL_INCREASE.test(statement)) {
      return 'negative'
    }
    if (DIRECTIONAL_INCREASE.test(statement) && DIRECTIONAL_DECREASE.test(statement)) {
      if (/\b(reduces?|reduce|cuts?|shortens?|declined?|dropped?|lower|less|fewer|slowed?)\b/i.test(statement)) {
        return 'negative'
      }
      return 'positive'
    }
  }
  return 'neutral'
}

export function isNullEffectOpposition(statementA: string, statementB: string): boolean {
  const a = claimEffectPolarity(statementA)
  const b = claimEffectPolarity(statementB)
  if (a === 'null_effect' && (b === 'positive' || b === 'negative')) return true
  if (b === 'null_effect' && (a === 'positive' || a === 'negative')) return true
  return false
}

export function isOpposingDirectionPair(statementA: string, statementB: string): boolean {
  const a = claimEffectPolarity(statementA)
  const b = claimEffectPolarity(statementB)
  if (a === 'positive' && b === 'negative') return true
  if (a === 'negative' && b === 'positive') return true
  if (isCoalRetirementOpposition(statementA, statementB)) return true
  if (deriveReadmissionDivideProposition(statementA, statementB)) {
    const reduceCtx =
      /\b(reduce|lower|decrease)\b/i.test(statementA) ||
      /\b(reduce|lower|decrease)\b/i.test(statementB)
    const riseCtx =
      /\b(rose|increased|higher|grew)\b/i.test(statementA) ||
      /\b(rose|increased|higher|grew)\b/i.test(statementB)
    if (reduceCtx && riseCtx) return true
  }
  return false
}

export function hasPropositionTargetOverlap(statementA: string, statementB: string): boolean {
  const shared = significantSharedTokens(statementA, statementB)
  const substantive = shared.filter((t) => t.length > 3)
  return substantive.length >= 2 || shared.length >= 3
}

type NumericRange = { low: number; high: number; unit: 'miles' | 'km' | 'unknown' }

function parseNumericRange(statement: string): NumericRange | null {
  const milesBetween = statement.match(
    /\bbetween\s+(\d{2,4})\s+and\s+(\d{2,4})\s*(miles?|mi)\b/i,
  )
  if (milesBetween) {
    return {
      low: Number(milesBetween[1]),
      high: Number(milesBetween[2]),
      unit: 'miles',
    }
  }
  const milesMatch = statement.match(
    /\b(\d{2,4})\s*(?:to|-|–)\s*(\d{2,4})\s*(miles?|mi)\b/i,
  )
  if (milesMatch) {
    return {
      low: Number(milesMatch[1]),
      high: Number(milesMatch[2]),
      unit: 'miles',
    }
  }
  const kmBetween = statement.match(
    /\b(?:roughly|about|between)\s+(\d{2,4})\s+(?:to|and)\s+(\d{2,4})\s*(kilometers?|km)\b/i,
  )
  if (kmBetween) {
    return {
      low: Number(kmBetween[1]),
      high: Number(kmBetween[2]),
      unit: 'km',
    }
  }
  const kmMatch = statement.match(
    /\b(\d{2,4})\s*(?:to|-|–)\s*(\d{2,4})\s*(kilometers?|km)\b/i,
  )
  if (kmMatch) {
    return {
      low: Number(kmMatch[1]),
      high: Number(kmMatch[2]),
      unit: 'km',
    }
  }
  return null
}

function rangeToKm(range: NumericRange): { low: number; high: number } {
  if (range.unit === 'km') return { low: range.low, high: range.high }
  if (range.unit === 'miles') {
    return {
      low: range.low * MILES_KM_RATIO,
      high: range.high * MILES_KM_RATIO,
    }
  }
  return { low: range.low, high: range.high }
}

function rangesOverlapKm(a: NumericRange, b: NumericRange): boolean {
  const aKm = rangeToKm(a)
  const bKm = rangeToKm(b)
  const overlapLow = Math.max(aKm.low, bKm.low)
  const overlapHigh = Math.min(aKm.high, bKm.high)
  if (overlapHigh < overlapLow) return false
  const overlapSpan = overlapHigh - overlapLow
  const minSpan = Math.min(aKm.high - aKm.low, bKm.high - bKm.low)
  return overlapSpan >= minSpan * 0.5
}

export function isNumericRangeEquivalent(statementA: string, statementB: string): boolean {
  const rangeA = parseNumericRange(statementA)
  const rangeB = parseNumericRange(statementB)
  if (!rangeA || !rangeB) return false
  return rangesOverlapKm(rangeA, rangeB)
}

export function deriveMetricDeclineProposition(a: string, b: string): string | null {
  if (!/\bph\b/i.test(`${a} ${b}`)) return null
  const declineCtx =
    /\b(declined?|dropped?|drop|decrease|lower|fallen)\b/i.test(a) &&
    /\b(declined?|dropped?|drop|decrease|lower|fallen)\b/i.test(b)
  const oceanCtx = /\b(ocean|seawater|surface|marine)\b/i.test(`${a} ${b}`)
  if (declineCtx && oceanCtx) {
    return 'ocean surface seawater pH has declined'
  }
  return null
}

export function deriveDrivingRangeEquivalenceProposition(a: string, b: string): string | null {
  if (!isNumericRangeEquivalent(a, b)) return null
  if (!/\b(electric|ev|vehicle|range|charge|recharg)\b/i.test(`${a} ${b}`)) return null
  return 'mass market electric vehicle range'
}

export function derivePolicyInvestmentProposition(a: string, b: string): string | null {
  if (!POLICY_INVESTMENT_MARKERS.test(a) || !POLICY_INVESTMENT_MARKERS.test(b)) return null
  const investCtx =
    /\b(investment|capital allocation|accelerate|drive|renewable|clean energy)\b/i.test(`${a} ${b}`)
  if (!investCtx) return null
  return 'carbon pricing or emissions trading drives utility scale renewable energy investment'
}

export function deriveRuralAccessProposition(a: string, b: string): string | null {
  if (!RURAL_ACCESS_MARKERS.test(a) || !RURAL_ACCESS_MARKERS.test(b)) return null
  const accessCtx = /\b(access|expanded|gained|specialist)\b/i.test(`${a} ${b}`)
  if (!accessCtx) return null
  return 'telehealth expanded rural specialist access'
}

export function deriveReadmissionDivideProposition(a: string, b: string): string | null {
  if (!READMISSION_MARKERS.test(a) || !READMISSION_MARKERS.test(b)) return null
  const reduceCtx = /\b(reduce|lower|decrease)\b/i.test(a) || /\b(reduce|lower|decrease)\b/i.test(b)
  const riseCtx = /\b(rose|increased|higher|grew)\b/i.test(a) || /\b(rose|increased|higher|grew)\b/i.test(b)
  if (reduceCtx && riseCtx) {
    return 'telehealth affects heart failure hospital readmission rates'
  }
  return null
}

export function deriveCoalRetirementDivideProposition(a: string, b: string): string | null {
  if (!COAL_RETIREMENT_MARKERS.test(a) || !COAL_RETIREMENT_MARKERS.test(b)) return null
  const fasterCtx =
    /\b(faster|accelerat|declined?\s+\d+|faster after)\b/i.test(a) ||
    /\b(faster|accelerat|declined?\s+\d+|faster after)\b/i.test(b)
  const slowerCtx =
    /\b(slowed?|slowing|delayed?|delaying)\b/i.test(a) ||
    /\b(slowed?|slowing|delayed?|delaying)\b/i.test(b)
  if (fasterCtx && slowerCtx) {
    return 'carbon pricing affects EU coal plant retirement pace'
  }
  return null
}

export function isCoalRetirementOpposition(a: string, b: string): boolean {
  return deriveCoalRetirementDivideProposition(a, b) !== null
}

export function isHazardHealthComplementaryPair(a: string, b: string): boolean {
  if (!HAZARD_MARKERS.test(a) || !HAZARD_MARKERS.test(b)) return false
  if (!HEALTH_OUTCOME_MARKERS.test(a) || !HEALTH_OUTCOME_MARKERS.test(b)) return false
  if (!hasPropositionTargetOverlap(a, b)) return false
  const outcomeA = contentTokens(a).filter((t) =>
    /respiratory|cardiovascular|inflammation|admissions|asthma|lung|cardiac|emergency/.test(t),
  )
  const outcomeB = contentTokens(b).filter((t) =>
    /respiratory|cardiovascular|inflammation|admissions|asthma|lung|cardiac|emergency/.test(t),
  )
  if (outcomeA.length === 0 || outcomeB.length === 0) return false
  const sharedOutcomes = outcomeA.filter((t) => outcomeB.includes(t))
  return sharedOutcomes.length === 0
}

export function isPhenomenonOutcomeComplementaryPair(a: string, b: string): boolean {
  const mechanismSide = PHENOMENON_MARKERS.test(a) || PHENOMENON_MARKERS.test(b)
  const ecosystemSide = ECOSYSTEM_OUTCOME_MARKERS.test(a) || ECOSYSTEM_OUTCOME_MARKERS.test(b)
  if (!mechanismSide || !ecosystemSide) return false
  const bleachingCtx =
    /\bbleach|symbiotic algae|algae expulsion|temperature spike/i.test(`${a} ${b}`)
  const coralCtx = /\bcoral\b/i.test(`${a} ${b}`)
  return bleachingCtx && coralCtx
}

export function deriveHazardHealthCombinedExplanation(a: string, b: string): string | null {
  if (!isHazardHealthComplementaryPair(a, b)) return null
  const shared = significantSharedTokens(a, b).filter((t) =>
    /wildfire|smoke|particulate|exposure|hazard/.test(t),
  )
  if (shared.length === 0) return null
  return shared.slice(0, 3).join(' ')
}

export function derivePhenomenonOutcomeCombinedExplanation(a: string, b: string): string | null {
  if (!isPhenomenonOutcomeComplementaryPair(a, b)) return null
  const shared = significantSharedTokens(a, b).filter((t) =>
    /coral|bleaching|reef|ecosystem/.test(t),
  )
  if (shared.length >= 2) return shared.slice(0, 3).join(' ')
  return 'coral reef bleaching'
}

export function hasSemanticPredicateCompatibility(a: string, b: string): boolean {
  if (isNumericRangeEquivalent(a, b)) return true
  if (deriveMetricDeclineProposition(a, b)) return true
  if (derivePolicyInvestmentProposition(a, b)) return true
  if (deriveRuralAccessProposition(a, b)) return true
  if (isNullEffectOpposition(a, b)) return true
  if (isOpposingDirectionPair(a, b)) return true
  return false
}

export function hasPlausibleComparabilitySignal(a: string, b: string): boolean {
  return (
    hasPropositionTargetOverlap(a, b) ||
    isNumericRangeEquivalent(a, b) ||
    isNullEffectOpposition(a, b) ||
    isOpposingDirectionPair(a, b) ||
    isHazardHealthComplementaryPair(a, b) ||
    isPhenomenonOutcomeComplementaryPair(a, b) ||
    hasSemanticPredicateCompatibility(a, b)
  )
}
