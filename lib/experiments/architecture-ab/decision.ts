import { loadAbTestCases } from '@/lib/experiments/architecture-ab/test-cases'

export function decideArchitecture(summary: AbExperimentSummary): ArchitectureDecision {
  const { aggregate, cases } = summary
  const aLead = aggregate.aWins
  const bLead = aggregate.bWins
  const precisionGap = aggregate.avgPrecisionA - aggregate.avgPrecisionB
  const recallGap = aggregate.avgRecallB - aggregate.avgRecallA
  const qualityGap = aggregate.avgWeightedB - aggregate.avgWeightedA
  const costGap = aggregate.avgCostA - aggregate.avgCostB
  const latencyGap = aggregate.avgLatencyA - aggregate.avgLatencyB

  const realSets = cases.filter((c) => {
    const frozen = loadAbTestCases().find((t) => t.caseId === c.caseId)
    return frozen?.isRealYouTube ?? false
  }).length
  const syntheticSets = cases.length - realSets

  const hallucinationCases = cases.filter((c) => c.hallucinationPenaltyB > 0).length
  const aZeroCollapse = cases.filter(
    (c) =>
      c.setType !== 'mixed' &&
      c.setType !== 'mismatch' &&
      c.architectureA.verifiedRelationshipCount === 0,
  ).length

  const why: string[] = []
  const whatABetter: string[] = []
  const whatBBetter: string[] = []

  if (aggregate.avgPrecisionA > aggregate.avgPrecisionB + 0.1) {
    whatABetter.push('Higher relationship/evidence precision on average')
  }
  if (aggregate.avgRecallA > aggregate.avgRecallB + 0.1) {
    whatABetter.push('Better important-relationship recall on structured sets')
  }
  if (aggregate.avgLatencyB < aggregate.avgLatencyA * 0.7) {
    whatBBetter.push('Lower end-to-end latency')
  }
  if (aggregate.avgCostB < aggregate.avgCostA * 0.7) {
    whatBBetter.push('Lower LLM cost per synthesis')
  }
  if (qualityGap > 0.2) {
    whatBBetter.push('Higher weighted product quality score')
  } else if (qualityGap < -0.2) {
    whatABetter.push('Higher weighted product quality score')
  }

  let decision: ArchitectureDecision['decision']
  let confidence: ArchitectureDecision['confidence'] = 'MEDIUM'
  let provisional = syntheticSets > 0 && realSets < 3

  if (
    bLead > aLead + 1 &&
    qualityGap > 0.15 &&
    hallucinationCases <= 1 &&
    aggregate.avgPrecisionB >= 0.6
  ) {
    decision = 'SIMPLIFY'
    why.push('B wins more cases with better weighted quality and acceptable precision')
  } else if (
    aLead >= bLead &&
    precisionGap >= -0.05 &&
    hallucinationCases >= 2
  ) {
    decision = 'KEEP_V2'
    why.push('A wins or ties user preference with stronger precision / fewer hallucinations')
  } else if (
    recallGap > 0.1 &&
    precisionGap > 0.1 &&
    bLead >= aLead - 1
  ) {
    decision = 'HYBRID'
    why.push('B leads recall/answer quality; A leads precision — combine direct synthesis with verification layer')
  } else if (aLead > bLead && precisionGap >= 0) {
    decision = 'KEEP_V2'
    why.push('A wins majority of cases; relationship funnel adds defensible precision')
  } else if (bLead > aLead && qualityGap > 0) {
    decision = 'SIMPLIFY'
    why.push('B wins majority with better composite score and simpler surface')
  } else {
    decision = 'HYBRID'
    confidence = 'LOW'
    provisional = true
    why.push('Mixed results — direct synthesis for answers, relationship engine for verification')
  }

  if (aZeroCollapse >= 2) {
    why.push(`A returned zero verified relationships on ${aZeroCollapse} non-mixed sets (catastrophic funnel risk)`)
    if (decision === 'KEEP_V2') {
      decision = 'HYBRID'
      confidence = 'LOW'
    }
  }

  if (hallucinationCases >= 3) {
    why.push('B showed repeated evidence hallucinations — not safe to SIMPLIFY without validation layer')
    if (decision === 'SIMPLIFY') decision = 'HYBRID'
  }

  const nextArchitecture =
    decision === 'SIMPLIFY'
      ? 'Replace relationship-first primary path with direct cross-source synthesis + lightweight validation'
      : decision === 'KEEP_V2'
        ? 'Retain V2.2 relationship-first architecture; improve UX layer only'
        : 'Direct per-source answers + cross-source synthesis → optional relationship verification / evidence audit'

  return {
    decision,
    confidence,
    provisional,
    why,
    whatABetter,
    whatBBetter,
    nextArchitecture,
    realSetsRun: realSets,
    syntheticSetsRun: syntheticSets,
  }
}

export function aggregateCases(cases: CaseEvaluation[]): AbExperimentSummary['aggregate'] {
  let aWins = 0
  let bWins = 0
  let ties = 0
  let neither = 0
  let sumA = 0
  let sumB = 0
  let sumPrecA = 0
  let sumPrecB = 0
  let sumRecallA = 0
  let sumRecallB = 0
  let sumLatA = 0
  let sumLatB = 0
  let sumCostA = 0
  let sumCostB = 0

  for (const c of cases) {
    if (c.userPreference === 'A') aWins++
    else if (c.userPreference === 'B') bWins++
    else if (c.userPreference === 'TIE') ties++
    else neither++

    sumA += c.weightedScoreA
    sumB += c.weightedScoreB
    sumPrecA += c.relationshipPrecisionA
    sumPrecB += c.relationshipPrecisionB
    sumRecallA += c.relationshipRecallA
    sumRecallB += c.relationshipRecallB
    sumLatA += c.architectureA.timingMs.totalMs
    sumLatB += c.architectureB.timingMs.totalMs
    sumCostA += c.architectureA.costSummary.totalEstimatedCostUsd ?? 0
    sumCostB += c.architectureB.costSummary.totalEstimatedCostUsd ?? 0
  }

  const n = cases.length || 1
  return {
    aWins,
    bWins,
    ties,
    neither,
    avgWeightedA: sumA / n,
    avgWeightedB: sumB / n,
    avgPrecisionA: sumPrecA / n,
    avgPrecisionB: sumPrecB / n,
    avgRecallA: sumRecallA / n,
    avgRecallB: sumRecallB / n,
    avgLatencyA: sumLatA / n,
    avgLatencyB: sumLatB / n,
    avgCostA: sumCostA / n,
    avgCostB: sumCostB / n,
  }
}
