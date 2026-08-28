import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type ClaimLossRow = {
  evidence: string
  extractedClaim: string
  relevanceScore: string
  role: string
  scope: string
  qualityClass: string
  comparisonEligibility: string
  generationEligibility: string
  dropStage: string
  dropReason: string
}

export type VerificationLossRow = {
  claimA: string
  claimB: string
  sourceA: string
  sourceB: string
  candidateScore: string
  proposedType: string
  semanticSimilarity: string
  rejectionBucket: string
  rejectionReason: string
  verdict: string
}

export type FalseRejectionRow = {
  claimA: string
  claimB: string
  candidateScore: string
  proposedType: string
  semanticSimilarity: string
  rejectionReason: string
  rationale: string
}

export type DeepDiagnostics = {
  claimLossRows: ClaimLossRow[]
  verificationLossRows: VerificationLossRow[]
  falseRejectionRows: FalseRejectionRow[]
  e2eFailureReasons: string[]
}

const SOURCE_2_KEY_EVIDENCE_THEMES: Array<{
  theme: string
  sectionId?: string
  claimIdHint?: string
  evidenceSnippet?: string
}> = [
  {
    theme: 'MCP vs API difference (user experience)',
    claimIdHint: 'source_2_claim_1',
    evidenceSnippet: 'MCP interface intuitive, less technical expertise than API integration',
  },
  {
    theme: 'Deployment speed vs disparate APIs',
    claimIdHint: 'source_2_claim_2',
    evidenceSnippet: 'quick deployment case studies compared to API integrations',
  },
  {
    theme: 'Existing APIs vs new technology',
    sectionId: 'section_23',
    claimIdHint: 'source_2_sec23_claim_1',
    evidenceSnippet: 'distinction between existing API solutions and new technology',
  },
  {
    theme: 'Rapid MCP spread / emergence factors',
    sectionId: 'section_24',
    claimIdHint: 'source_2_sec24_claim_1',
    evidenceSnippet: 'rapid emergence attributed to key factors',
  },
  {
    theme: 'MCP tools significance',
    sectionId: 'section_36',
    evidenceSnippet: 'MCP tools significance in context of integration',
  },
  {
    theme: 'LLM relevance / application connection',
    sectionId: 'section_72',
    evidenceSnippet: 'LLM relevance in ongoing analysis or application context',
  },
  {
    theme: 'Application integration / automation',
    sectionId: 'section_56',
    evidenceSnippet: 'automation in relation to AI integration',
  },
  {
    theme: 'Differentiation crucial to success',
    sectionId: 'section_21',
    claimIdHint: 'source_2_sec21_claim_1',
    evidenceSnippet: 'differentiation crucial for success in competitive landscape',
  },
]

const META_POPULARITY =
  /\b(popular|youtube|market relevance|hot topic|dominating|discussion|trending|stories)\b/i
const TECH_MECHANISM =
  /\b(tool|protocol|integrat|api|connect|language|enables|deploy|workflow|llm|application)\b/i

function na(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A'
  return String(value)
}

function rejectionBucket(reason: string | undefined): string {
  if (!reason) return 'UNKNOWN'
  const r = reason.toUpperCase()
  if (r.includes('ALIGNMENT')) return 'ALIGNMENT_FAILED'
  if (r.includes('DIFFERENT_DIMENSION') || r.includes('DIMENSION')) return 'DIFFERENT_DIMENSION'
  if (r.includes('LOGICAL_GAP')) return 'LOGICAL_GAP'
  if (r.includes('TOPIC_ONLY')) return 'TOPIC_ONLY'
  if (r.includes('INSUFFICIENT_EVIDENCE') || r.includes('EVIDENCE')) return 'INSUFFICIENT_EVIDENCE'
  if (r.includes('SUBJECT')) return 'SUBJECT_MISMATCH'
  if (r.includes('POLARITY')) return 'POLARITY_MISMATCH'
  return 'UNKNOWN'
}

function isMetaOnlyClaim(text: string): boolean {
  return META_POPULARITY.test(text) && !TECH_MECHANISM.test(text)
}

function isTechnicalClaim(text: string): boolean {
  return TECH_MECHANISM.test(text)
}

function isDefinitionalClaim(text: string): boolean {
  return /\b(protocol|common language|usbc|standard|means|refers|likening|analogy)\b/i.test(text)
}

function inferDropStage(row: {
  usable?: boolean
  comparable?: boolean
  generationEligible?: boolean
  inGenerationSet?: boolean
  relevanceDecision?: string
  poolDropReason?: string
  qualityRejectionReason?: string
  tier?: string
}): { stage: string; reason: string } {
  if (row.inGenerationSet) return { stage: 'NONE (in generation)', reason: '—' }
  if (row.generationEligible) {
    return { stage: 'GENERATION_SELECTION', reason: 'Eligible but not selected for generation set' }
  }
  if (row.poolDropReason) {
    return { stage: 'COMPARISON_ELIGIBILITY', reason: row.poolDropReason }
  }
  if (row.qualityRejectionReason) {
    return { stage: 'QUALITY_GATE', reason: String(row.qualityRejectionReason) }
  }
  if (row.comparable === false && row.usable) {
    return { stage: 'COMPARABLE_POOL', reason: row.poolDropReason ?? 'Not in comparable pool' }
  }
  if (row.relevanceDecision === 'DROP' || row.tier === 'OFF_TOPIC') {
    return {
      stage: 'RELEVANCE',
      reason: row.tier === 'OFF_TOPIC' ? 'OFF_TOPIC' : 'Relevance DROP',
    }
  }
  if (!row.usable) {
    return { stage: 'RELEVANCE', reason: 'Not usable after relevance funnel' }
  }
  return { stage: 'UNKNOWN', reason: 'Pipeline stage unclear' }
}

function findClaimForTheme(
  claims: ReasoningClaim[],
  theme: { claimIdHint?: string; sectionId?: string },
): ReasoningClaim | undefined {
  if (theme.claimIdHint) {
    const exact = claims.find((c) => c.id === theme.claimIdHint)
    if (exact) return exact
  }
  if (theme.sectionId) {
    return claims.find(
      (c) =>
        c.sourceId === 'source_2' &&
        (c.id.includes(theme.sectionId!) ||
          c.evidenceSpans?.some((s) => s.segmentId === theme.sectionId) ||
          c.evidenceIds.some((id) => id.includes(theme.sectionId!))),
    )
  }
  return undefined
}

function buildClaimLossRows(snapshot: ReasoningEvalSnapshot): ClaimLossRow[] {
  const r = snapshot.reasoning
  if (!r) return []

  const transition = r.diagnostics?.claimTransitionDiagnostics ?? []
  const transitionById = new Map(transition.map((t) => [t.claimId, t]))
  const claims = r.claims.filter((c) => c.sourceId === 'source_2')
  const claimsById = new Map(claims.map((c) => [c.id, c]))

  const rows: ClaimLossRow[] = []

  for (const theme of SOURCE_2_KEY_EVIDENCE_THEMES) {
    const claim =
      findClaimForTheme(claims, theme) ??
      (theme.claimIdHint
        ? (claimsById.get(theme.claimIdHint) ??
          (transitionById.has(theme.claimIdHint)
            ? {
                id: theme.claimIdHint,
                sourceId: 'source_2',
                statement: transitionById.get(theme.claimIdHint)!.claimText,
              }
            : undefined))
        : undefined)
    const row = claim ? transitionById.get(claim.id) : undefined

    if (!claim) {
      rows.push({
        evidence: `${theme.theme}: ${theme.evidenceSnippet ?? theme.sectionId ?? 'N/A'}`,
        extractedClaim: 'NOT_EXTRACTED',
        relevanceScore: 'N/A',
        role: 'N/A',
        scope: 'N/A',
        qualityClass: 'N/A',
        comparisonEligibility: 'N/A',
        generationEligibility: 'NO',
        dropStage: 'EXTRACTION',
        dropReason: 'No claim extracted from section evidence (empty section claims[])',
      })
      continue
    }

    const claimId = row?.claimId ?? claim?.id ?? 'N/A'
    const transitionRow = row ?? transitionById.get(claimId)
    const drop = inferDropStage(transitionRow ?? {})

    const evidenceText =
      transitionRow?.evidenceText ??
      claim?.evidenceText?.slice(0, 160) ??
      theme.evidenceSnippet ??
      'N/A'

    rows.push({
      evidence: `${theme.theme}: ${evidenceText}`,
      extractedClaim: transitionRow?.claimText ?? claim?.statement ?? 'N/A',
      relevanceScore: na(transitionRow?.relevanceScore),
      role: na(transitionRow?.tier),
      scope: na(transitionRow?.claimScope ?? claim?.claimScope),
      qualityClass: na(transitionRow?.claimQualityClass ?? claim?.claimQualityClass),
      comparisonEligibility: na(
        transitionRow?.comparisonEligibility ?? claim?.comparisonEligibility,
      ),
      generationEligibility: transitionRow?.generationEligible ? 'YES' : 'NO',
      dropStage: transitionRow?.inGenerationSet ? 'NONE' : drop.stage,
      dropReason: transitionRow?.inGenerationSet ? '—' : drop.reason,
    })
  }

  return rows
}

function buildVerificationLossRows(snapshot: ReasoningEvalSnapshot): VerificationLossRow[] {
  const audit =
    snapshot.reasoning?.diagnostics?.verificationDiagnosticsBundle?.candidateAudit ?? []

  return audit
    .filter((c) => c.verificationResult === 'REJECT')
    .sort((a, b) => b.candidateScore - a.candidateScore)
    .map((c) => {
      const bucket = rejectionBucket(c.verificationRejectionReason)
      const metaVsTech =
        (isMetaOnlyClaim(c.claimA) && isTechnicalClaim(c.claimB)) ||
        (isMetaOnlyClaim(c.claimB) && isTechnicalClaim(c.claimA))
      const verdict = metaVsTech
        ? 'EXPECTED_REJECT (meta vs mechanism)'
        : bucket === 'ALIGNMENT_FAILED' && isMetaOnlyClaim(c.claimA + c.claimB)
          ? 'EXPECTED_REJECT (topic overlap only)'
          : 'REVIEW'

      return {
        claimA: c.claimA,
        claimB: c.claimB,
        sourceA: c.sourceA,
        sourceB: c.sourceB,
        candidateScore: c.candidateScore.toFixed(3),
        proposedType: c.proposedType,
        semanticSimilarity: na(c.semanticSimilarity?.toFixed(3)),
        rejectionBucket: bucket,
        rejectionReason: na(c.verificationRejectionReason),
        verdict,
      }
    })
}

function buildFalseRejectionRows(snapshot: ReasoningEvalSnapshot): FalseRejectionRow[] {
  const audit =
    snapshot.reasoning?.diagnostics?.verificationDiagnosticsBundle?.candidateAudit ?? []

  const candidates: FalseRejectionRow[] = []

  for (const c of audit) {
    if (c.verificationResult !== 'REJECT') continue

    const bucket = rejectionBucket(c.verificationRejectionReason)
    if (bucket !== 'ALIGNMENT_FAILED' && bucket !== 'UNKNOWN') continue

    const sim = c.semanticSimilarity ?? 0
    if (sim < 0.22) continue

    const metaVsTech =
      (isMetaOnlyClaim(c.claimA) && isTechnicalClaim(c.claimB)) ||
      (isMetaOnlyClaim(c.claimB) && isTechnicalClaim(c.claimA))
    if (metaVsTech) continue

    const bothDefinitional = isDefinitionalClaim(c.claimA) && isDefinitionalClaim(c.claimB)
    const bothTechnical = isTechnicalClaim(c.claimA) && isTechnicalClaim(c.claimB)
    const agreementType =
      c.proposedType === 'AGREEMENT' || c.proposedType === 'PARTIAL_AGREEMENT'

    if (!bothDefinitional && !bothTechnical && !agreementType) continue

    if (bucket === 'ALIGNMENT_FAILED' && sim >= 0.25 && (bothDefinitional || bothTechnical)) {
      candidates.push({
        claimA: c.claimA,
        claimB: c.claimB,
        candidateScore: c.candidateScore.toFixed(3),
        proposedType: c.proposedType,
        semanticSimilarity: sim.toFixed(3),
        rejectionReason: na(c.verificationRejectionReason),
        rationale:
          bothDefinitional
            ? 'Definitional paraphrase pair rejected — possible alignment rule over-rejection'
            : 'Technical mechanism pair with moderate similarity rejected — review alignment',
      })
    } else if (bucket === 'UNKNOWN' && sim >= 0.28 && agreementType && bothTechnical) {
      candidates.push({
        claimA: c.claimA,
        claimB: c.claimB,
        candidateScore: c.candidateScore.toFixed(3),
        proposedType: c.proposedType,
        semanticSimilarity: sim.toFixed(3),
        rejectionReason: na(c.verificationRejectionReason),
        rationale: 'Agreement-typed technical pair rejected with UNKNOWN — verifier ambiguity',
      })
    }
  }

  return candidates.sort((a, b) => Number(b.candidateScore) - Number(a.candidateScore))
}

export function buildDeepDiagnostics(snapshot: ReasoningEvalSnapshot): DeepDiagnostics {
  const e2eFailureReasons = snapshot.e2eEvaluation.failureReasons ?? []
  if (e2eFailureReasons.length === 0 && snapshot.e2eEvaluation.reason) {
    e2eFailureReasons.push(snapshot.e2eEvaluation.reason)
  }

  return {
    claimLossRows: buildClaimLossRows(snapshot),
    verificationLossRows: buildVerificationLossRows(snapshot),
    falseRejectionRows: buildFalseRejectionRows(snapshot),
    e2eFailureReasons,
  }
}

export function formatClaimLossSection(rows: ClaimLossRow[]): string {
  if (rows.length === 0) return 'No Source 2 claim loss data available.'

  const header =
    '| Evidence | Extracted Claim | Relevance | Role | Scope | Quality | Comparison | Generation | Drop Stage | Drop Reason |'
  const sep =
    '|---|---|---:|---|---|---|---|---|---|---|'

  const body = rows
    .map((r) =>
      `| ${r.evidence.replace(/\|/g, '/')} | ${r.extractedClaim.replace(/\|/g, '/')} | ${r.relevanceScore} | ${r.role} | ${r.scope} | ${r.qualityClass} | ${r.comparisonEligibility} | ${r.generationEligibility} | ${r.dropStage} | ${r.dropReason} |`,
    )
    .join('\n')

  return `${header}\n${sep}\n${body}`
}

export function formatVerificationLossSection(rows: VerificationLossRow[]): string {
  if (rows.length === 0) return 'No rejected candidates to analyze.'

  const dist: Record<string, number> = {}
  for (const r of rows) {
    dist[r.rejectionBucket] = (dist[r.rejectionBucket] ?? 0) + 1
  }

  const distLines = Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const tableHeader =
    '| Score | Type | Sim | Bucket | Sources | Claim A | Claim B | Verdict |'
  const tableSep = '|---:|---|---:|---|---|---|---|---|'
  const tableBody = rows
    .map(
      (r) =>
        `| ${r.candidateScore} | ${r.proposedType} | ${r.semanticSimilarity} | ${r.rejectionBucket} | ${r.sourceA}/${r.sourceB} | ${r.claimA.slice(0, 55)} | ${r.claimB.slice(0, 55)} | ${r.verdict} |`,
    )
    .join('\n')

  return `### Rejection distribution\n\n${distLines}\n\n### Per-candidate rejections\n\n${tableHeader}\n${tableSep}\n${tableBody}`
}

export function formatFalseRejectionSection(rows: FalseRejectionRow[]): string {
  if (rows.length === 0) {
    return 'No suspected false rejections identified (meta vs mechanism rejections excluded).'
  }

  return rows
    .map(
      (r, i) =>
        `### Suspected #${i + 1}\n\n- Score: ${r.candidateScore} | Type: ${r.proposedType} | Sim: ${r.semanticSimilarity}\n- Reason: ${r.rejectionReason}\n- Claim A: ${r.claimA}\n- Claim B: ${r.claimB}\n- Rationale: ${r.rationale}`,
    )
    .join('\n\n')
}

export function formatE2eFailureSection(reasons: string[]): string {
  if (reasons.length === 0) return 'No E2E quality failures (reasoning quality PASS).'
  return reasons.map((r) => `- ${r}`).join('\n')
}
