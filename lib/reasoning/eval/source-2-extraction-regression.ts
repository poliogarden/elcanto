import type { ReasoningEvalSnapshot } from '@/lib/reasoning/eval/types'
import type { SourceAnalysis } from '@/lib/types/source'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

export type Source2ExtractionRow = {
  theme: string
  evidenceFound: boolean
  claimExtracted: boolean
  extractedClaim: string
  evidenceSnippet: string
  evidenceLinked: string
  fidelityValid: string
  relevanceResult: string
}

const SOURCE_2_THEMES: Array<{
  theme: string
  patterns: RegExp
}> = [
  {
    theme: 'MCP vs API difference',
    patterns: /\b(api|user.?friendly|intuitive|technical expertise|integration).*(mcp|api)|mcp.*(api|integrat)/i,
  },
  {
    theme: 'Deployment speed vs APIs',
    patterns: /\b(deploy|deployment|faster|quick|speed).*(api|integrat|mcp)|disparate api/i,
  },
  {
    theme: 'Integration model',
    patterns: /\b(integrat|interface|workflow|connect|application)/i,
  },
  {
    theme: 'MCP tools',
    patterns: /\b(mcp tools?|tool integration|tools? significance)/i,
  },
  {
    theme: 'LLM / application connection',
    patterns: /\b(llm|application|connect.*app)/i,
  },
  {
    theme: 'Adoption / spread reasons',
    patterns: /\b(adopt|spread|emergence|rapid|dominat|hot topic|popular)/i,
  },
]

function sectionText(section: { text?: string; summary: string }): string {
  return (section.text?.trim() ? section.text : section.summary).trim()
}

export function buildSource2ExtractionRegression(input: {
  source2Analysis?: SourceAnalysis
  reasoning?: MultiSourceReasoning | null
}): Source2ExtractionRow[] {
  const sections = input.source2Analysis?.videoKnowledge?.sections ?? []
  const claims = input.reasoning?.claims.filter((c) => c.sourceId === 'source_2') ?? []
  const transition =
    input.reasoning?.diagnostics?.claimTransitionDiagnostics?.filter(
      (r) => r.sourceId === 'source_2',
    ) ?? []

  const rows: Source2ExtractionRow[] = []

  for (const theme of SOURCE_2_THEMES) {
    const matchingSections = sections.filter((s) => theme.patterns.test(sectionText(s)))
    const sectionClaims = matchingSections.flatMap((s) => s.claims)
    const matchingClaims = claims.filter((c) => theme.patterns.test(c.statement))
    const matchingTransition = transition.filter((t) => theme.patterns.test(t.claimText))

    const bestClaim =
      matchingClaims[0] ??
      (sectionClaims[0]
        ? {
            statement: sectionClaims[0].statement,
            evidenceText: matchingSections[0] ? sectionText(matchingSections[0]).slice(0, 120) : '',
          }
        : null)

    const transitionRow = bestClaim
      ? matchingTransition.find((t) => t.claimText.includes(bestClaim.statement.slice(0, 40))) ??
        matchingTransition[0]
      : matchingTransition[0]

    const evidenceSnippet =
      matchingSections[0]
        ? sectionText(matchingSections[0]).slice(0, 140)
        : bestClaim?.evidenceText?.slice(0, 140) ?? 'N/A'

    rows.push({
      theme: theme.theme,
      evidenceFound: matchingSections.length > 0,
      claimExtracted: Boolean(bestClaim || sectionClaims.length > 0),
      extractedClaim: bestClaim?.statement ?? transitionRow?.claimText ?? 'NOT_EXTRACTED',
      evidenceSnippet,
      evidenceLinked: transitionRow?.evidenceText?.slice(0, 100) ?? bestClaim?.evidenceText?.slice(0, 100) ?? 'N/A',
      fidelityValid: transitionRow?.fidelityStatus ?? 'N/A',
      relevanceResult: transitionRow
        ? `${transitionRow.tier} / ${transitionRow.relevanceDecision}`
        : 'N/A',
    })
  }

  return rows
}

export function formatSource2RegressionSection(rows: Source2ExtractionRow[]): string {
  const header =
    '| Theme | Evidence | Claim | Evidence snippet | Linked | Fidelity | Relevance |'
  const sep = '|---|---|---|---|---|---|---|'
  const body = rows
    .map(
      (r) =>
        `| ${r.theme} | ${r.evidenceFound ? 'YES' : 'NO'} | ${r.claimExtracted ? 'YES' : 'NO'} | ${r.evidenceSnippet.replace(/\|/g, '/').slice(0, 60)} | ${r.evidenceLinked.replace(/\|/g, '/').slice(0, 40)} | ${r.fidelityValid} | ${r.relevanceResult} |`,
    )
    .join('\n')
  return `${header}\n${sep}\n${body}`
}

export function findSource2Analysis(snapshot: ReasoningEvalSnapshot): SourceAnalysis | undefined {
  // Eval snapshot may store refreshed analysis only in reasoning sources - use fixture reload
  return undefined
}
