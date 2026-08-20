import { isDisplayableRelationship } from '@/lib/synthesis/relationship-stats'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type {
  ClaimRelationship,
  CrossSourcePattern,
} from '@/lib/types/relationship'
import type {
  CrossSourceTheme,
  EditorialComparison,
  SynthesisFinding,
} from '@/lib/types/synthesis-report'
import type { SourceAnalysis } from '@/lib/types/source'

function parseVoiceIndex(sourceId: string): number {
  const match = sourceId.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function findClaimStatement(sources: SourceAnalysis[], claimId: string): string {
  for (const source of sources) {
    const claim = source.claims?.find((c) => c.id === claimId)
    if (claim) return claim.statement
  }
  return 'Claim not found.'
}

function findSourceTitle(sources: SourceAnalysis[], sourceId: string): string {
  return sources.find((s) => s.sourceId === sourceId)?.title ?? sourceId
}

function sideLabel(type: ClaimRelationship['type'], kind: 'agreement' | 'disagreement'): string {
  if (kind === 'agreement') return 'SHARED VIEW'
  if (type === 'disagreement') return 'OPPOSING VIEW'
  return 'DIFFERENT TAKE'
}

export function buildSynthesisFindings(
  themes: CrossSourceTheme[],
  setAnalysis: SetAnalysis,
  patterns: CrossSourcePattern[],
  relationships: ClaimRelationship[],
): SynthesisFinding[] {
  const findings: SynthesisFinding[] = []

  for (const theme of themes.slice(0, 6)) {
    findings.push({
      id: `finding_${theme.id}`,
      title: theme.title,
      explanation: theme.synthesisSentence,
      kind: 'theme',
      sourceIds: theme.sourceIds,
      claimIds: theme.claimIds,
      relationshipIds: [],
      confidence: Math.min(0.95, theme.importance),
    })
  }

  for (const intersection of setAnalysis.intersections.slice(0, 4)) {
    findings.push({
      id: intersection.id,
      title: intersection.label,
      explanation: intersection.description,
      kind: 'intersection',
      sourceIds: intersection.sourceIds,
      claimIds: intersection.claimIds,
      relationshipIds: [],
      confidence: 0.75,
    })
  }

  for (const pattern of patterns.slice(0, 3)) {
    findings.push({
      id: `finding_${pattern.id}`,
      title: pattern.label,
      explanation: pattern.description,
      kind: 'pattern',
      sourceIds: pattern.sourceIds,
      claimIds: [],
      relationshipIds: pattern.relationshipIds,
      confidence: pattern.confidence,
    })
  }

  return findings.slice(0, 10)
}

export function buildEditorialComparisons(
  sources: SourceAnalysis[],
  relationships: ClaimRelationship[],
  limit = 4,
): { agreements: EditorialComparison[]; disagreements: EditorialComparison[] } {
  const meaningful = relationships
    .filter(isDisplayableRelationship)
    .filter((r) => r.fromSourceId !== r.toSourceId)
    .sort((a, b) => b.strength * b.confidence - a.strength * a.confidence)

  const agreements: EditorialComparison[] = []
  const disagreements: EditorialComparison[] = []

  for (const rel of meaningful) {
    const kind: 'agreement' | 'disagreement' | null =
      rel.type === 'agreement' || rel.type === 'partial_agreement'
        ? 'agreement'
        : rel.type === 'disagreement'
          ? 'disagreement'
          : null

    if (!kind) continue
    const target = kind === 'agreement' ? agreements : disagreements
    if (target.length >= limit) continue

    const fromVoice = parseVoiceIndex(rel.fromSourceId)
    const toVoice = parseVoiceIndex(rel.toSourceId)

    target.push({
      id: `editorial_${rel.id}`,
      kind,
      title: rel.explanation.split('.')[0]?.slice(0, 80) ?? rel.type,
      sideA: {
        label: sideLabel(rel.type, kind),
        voice: fromVoice,
        sourceId: rel.fromSourceId,
        title: findSourceTitle(sources, rel.fromSourceId),
        statement: findClaimStatement(sources, rel.fromClaimId),
        claimId: rel.fromClaimId,
      },
      sideB: {
        label: sideLabel(rel.type, kind === 'agreement' ? 'agreement' : 'disagreement'),
        voice: toVoice,
        sourceId: rel.toSourceId,
        title: findSourceTitle(sources, rel.toSourceId),
        statement: findClaimStatement(sources, rel.toClaimId),
        claimId: rel.toClaimId,
      },
      whyItMatters: rel.explanation,
      relationshipId: rel.id,
      claimIds: [rel.fromClaimId, rel.toClaimId],
    })
  }

  return { agreements, disagreements }
}

export function buildReportMeta(input: {
  claimCount: number
  themeCount: number
  relationshipCount: number
  findingCount: number
}) {
  return {
    version: 2 as const,
    claimCount: input.claimCount,
    themeCount: input.themeCount,
    relationshipCount: input.relationshipCount,
    findingCount: input.findingCount,
  }
}
