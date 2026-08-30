import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { auditComplexity } from '@/lib/experiments/architecture-ab/complexity'
import { aggregateCases, decideArchitecture } from '@/lib/experiments/architecture-ab/decision'
import { runArchitectureA } from '@/lib/experiments/architecture-ab/run-architecture-a'
import { runArchitectureB } from '@/lib/experiments/architecture-ab/run-architecture-b'
import {
  relationshipPrecisionA,
  relationshipRecallA,
  scoreArchitectureA,
  scoreArchitectureB,
  userPreferenceFromScores,
  weightedProductScore,
} from '@/lib/experiments/architecture-ab/scoring'
import { loadAbTestCases, persistFrozenInput } from '@/lib/experiments/architecture-ab/test-cases'
import type {
  AbExperimentSummary,
  CaseEvaluation,
  FrozenExperimentInput,
} from '@/lib/experiments/architecture-ab/types'

function blindLabels(caseId: string): {
  blindLabelA: 'Result X' | 'Result Y'
  blindLabelB: 'Result X' | 'Result Y'
} {
  const swap = caseId.charCodeAt(caseId.length - 1) % 2 === 0
  return swap
    ? { blindLabelA: 'Result Y', blindLabelB: 'Result X' }
    : { blindLabelA: 'Result X', blindLabelB: 'Result Y' }
}

async function saveCaseOutputs(
  caseId: string,
  a: unknown,
  b: unknown,
): Promise<void> {
  const dir = path.join(process.cwd(), 'reports', 'architecture-ab')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${caseId}-a.json`), JSON.stringify(a, null, 2), 'utf8')
  await writeFile(path.join(dir, `${caseId}-b.json`), JSON.stringify(b, null, 2), 'utf8')
}

export async function evaluateCase(input: FrozenExperimentInput): Promise<CaseEvaluation> {
  await persistFrozenInput(input)

  const architectureA = await runArchitectureA(input)
  const architectureB = await runArchitectureB(input)

  await saveCaseOutputs(input.caseId, architectureA, architectureB)

  const scoresA = scoreArchitectureA(
    architectureA,
    input.setType,
    architectureB.timingMs.totalMs,
    architectureB.costSummary.totalEstimatedCostUsd ?? 0,
  )
  const scoresB = scoreArchitectureB(
    architectureB,
    input.setType,
    architectureA.timingMs.totalMs,
    architectureA.costSummary.totalEstimatedCostUsd ?? 0,
  )

  const weightedScoreA = weightedProductScore(
    scoresA,
    architectureA.timingMs.totalMs,
    architectureA.costSummary.totalEstimatedCostUsd ?? 0,
  )
  const weightedScoreB = weightedProductScore(
    scoresB,
    architectureB.timingMs.totalMs,
    architectureB.costSummary.totalEstimatedCostUsd ?? 0,
  )

  const labels = blindLabels(input.caseId)

  const pref = userPreferenceFromScores(weightedScoreA, weightedScoreB)
  const timeSaving =
    weightedScoreA > weightedScoreB + 0.2 || weightedScoreB > weightedScoreA + 0.2
      ? 'YES'
      : pref === 'TIE'
        ? 'PARTIAL'
        : 'PARTIAL'
  const wouldReuse =
    Math.max(weightedScoreA, weightedScoreB) >= 3.5
      ? 'YES'
      : Math.max(weightedScoreA, weightedScoreB) >= 2.8
        ? 'MAYBE'
        : 'NO'

  return {
    caseId: input.caseId,
    setType: input.setType,
    ...labels,
    architectureA,
    architectureB,
    scoresA,
    scoresB,
    weightedScoreA,
    weightedScoreB,
    userPreference: pref,
    timeSaving,
    wouldReuse,
    relationshipPrecisionA: relationshipPrecisionA(architectureA),
    relationshipPrecisionB: architectureB.evidencePrecision,
    relationshipRecallA: relationshipRecallA(architectureA, input.setType),
    relationshipRecallB:
      scoreArchitectureB(architectureB, input.setType, 0, 0).importantRelationshipRecall / 5,
    goodZeroA: architectureA.goodZero,
    goodZeroB: architectureB.goodZero,
    inventedRelationshipA:
      input.setType === 'mixed' || input.setType === 'mismatch'
        ? architectureA.agreementCount + architectureA.divideCount > 2
        : false,
    inventedRelationshipB:
      input.setType === 'mixed' || input.setType === 'mismatch'
        ? architectureB.agreementCount + architectureB.divideCount > 2
        : false,
    hallucinationPenaltyB: architectureB.hallucinationCount,
  }
}

export async function runArchitectureAbExperiment(): Promise<AbExperimentSummary> {
  const cases = loadAbTestCases()
  const evaluations: CaseEvaluation[] = []

  for (const testCase of cases) {
    evaluations.push(await evaluateCase(testCase))
  }

  const aggregate = aggregateCases(evaluations)
  const complexity = auditComplexity()
  const decision = decideArchitecture({
    runAt: new Date().toISOString(),
    cases: evaluations,
    aggregate,
    complexity,
    decision: {
      decision: 'KEEP_V2',
      confidence: 'LOW',
      provisional: true,
      why: [],
      whatABetter: [],
      whatBBetter: [],
      nextArchitecture: '',
      realSetsRun: 0,
      syntheticSetsRun: 0,
    },
  })

  return {
    runAt: new Date().toISOString(),
    cases: evaluations,
    aggregate,
    complexity,
    decision,
  }
}
