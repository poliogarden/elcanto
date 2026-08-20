import type {
  EditorialComparisonView,
  FindingView,
  InsightDerivationStep,
  SynthesisViewModel,
  ThemeEvidenceView,
  ThemeView,
} from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type {
  ClaimRelationship,
  Insight,
  SynthesisType,
} from '@/lib/types/relationship'
import { buildTwoSourceSetView } from '@/lib/types/knowledge'
import { isDisplayableRelationship, strengthDisplayLabel } from '@/lib/synthesis/relationship-stats'
import { normalizeSynthesisResult } from '@/lib/synthesis/normalize-result'
import { discoverThemes } from '@/lib/synthesis/theme-engine'
import { buildEditorialComparisons } from '@/lib/synthesis/finding-engine'
import { buildInsightGraph } from '@/lib/insight-graph/build-insight-graph'
import type { InsightGraphData, VideoNodeData } from '@/lib/types/insight-graph'
import type { SourceAnalysis } from '@/lib/types/source'
import { formatTotalDuration } from '@/lib/youtube/url'
import { formatTimestamp, voiceIdFromIndex, youtubeWatchUrl } from '@/lib/youtube/timestamp'

const SUGGESTED_QUESTIONS = [
  'Why did you reach this conclusion?',
  'Where do they disagree most?',
  'Which source challenges the consensus?',
  'What assumption do they all share?',
  'What did none of them consider?',
  'Show evidence for the top insight.',
]

const SYNTHESIS_TYPE_LABELS: Record<SynthesisType, string> = {
  strong_consensus: 'Strong consensus',
  mixed: 'Mixed views',
  divergent: 'Divergent',
  clustered: 'Clustered topics',
  mostly_independent: 'Mostly independent',
}

const INSIGHT_TYPE_LABELS = {
  direct: 'Directly supported',
  cross_source_inference: 'Cross-source inference',
  interpretive: 'Interpretive insight',
} as const

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  agreement: 'Agreement',
  partial_agreement: 'Partial agreement',
  disagreement: 'Disagreement',
  complementary: 'Complementary',
  structural_parallel: 'Structural parallel',
  shared_topic: 'Shared topic',
  independent: 'Independent',
}

const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  deepen: 'Go deeper',
  counter: 'Counterargument',
  bridge: 'Bridge',
  evidence: 'Find evidence',
  missing_piece: 'Missing piece',
}

function enrichGraphWithVoices(
  graph: InsightGraphData,
  doc: SynthesisDocument,
): InsightGraphData {
  const voiceByIndex = new Map(doc.voices.map((v) => [v.voice.n, v.voice]))

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.type !== 'video') return node
      const data = node.data as VideoNodeData
      const voice = voiceByIndex.get(data.voiceIndex)
      if (!voice) return node
      return {
        ...node,
        data: {
          ...data,
          channel: voice.channel,
          thumbnail: voice.thumbnail,
        },
      }
    }),
  }
}

function workspaceMode(count: number): SynthesisViewModel['workspaceMode'] {
  if (count <= 1) return 'single'
  if (count === 2) return 'pair'
  if (count <= 5) return 'small'
  return 'cluster'
}

function parseVoiceIndex(sourceId: string): number {
  const match = sourceId.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function parseVoiceIndices(ids: string[]): number[] {
  return ids.map(parseVoiceIndex).filter((n) => n > 0)
}

function voiceMeta(doc: SynthesisDocument, sourceId: string) {
  const entry = doc.voices.find((v) => v.analysis?.sourceId === sourceId)
  return {
    voice: entry?.voice.n ?? parseVoiceIndex(sourceId),
    title: entry?.voice.title ?? sourceId,
    thumbnail: entry?.voice.thumbnail,
    youtubeId: entry?.voice.youtubeId,
  }
}

function buildThemeViews(doc: SynthesisDocument, result: NonNullable<ReturnType<typeof normalizeSynthesisResult>>): ThemeView[] {
  const themes =
    result.themes && result.themes.length > 0
      ? result.themes
      : discoverThemes(
          doc.voices.filter((v) => v.analysis).map((v) => v.analysis!),
          result.patterns,
        )

  return themes.map((theme, i) => {
    const evidence: ThemeEvidenceView[] = []
    for (const claimId of theme.evidenceClaimIds) {
      for (const entry of doc.voices) {
        if (!entry.analysis) continue
        const claim = entry.analysis.claims?.find((c) => c.id === claimId)
        if (!claim) continue
        const ev = entry.analysis.evidence[0]
        evidence.push({
          claimId,
          statement: claim.statement,
          voice: entry.voice.n,
          sourceTitle: entry.voice.title,
          thumbnail: entry.voice.thumbnail,
          timestamp: ev ? formatTimestamp(ev.timestamp) : undefined,
          watchUrl: ev ? youtubeWatchUrl(entry.voice.youtubeId, ev.timestamp) : undefined,
        })
        break
      }
    }

    const voices = parseVoiceIndices(theme.sourceIds)
    const meta = theme.sourceIds.map((id) => voiceMeta(doc, id))

    return {
      id: theme.id,
      index: String(i + 1).padStart(2, '0'),
      title: theme.title,
      description: theme.description,
      synthesisSentence: theme.synthesisSentence,
      voices,
      sourceTitles: meta.map((m) => m.title),
      thumbnails: meta.map((m) => m.thumbnail).filter(Boolean) as string[],
      claimIds: theme.claimIds,
      evidence,
      importance: theme.importance,
    }
  })
}

function buildEditorialViews(
  doc: SynthesisDocument,
  result: NonNullable<ReturnType<typeof normalizeSynthesisResult>>,
): { agreements: EditorialComparisonView[]; disagreements: EditorialComparisonView[] } {
  if (result.editorialAgreements?.length || result.editorialDisagreements?.length) {
    return {
      agreements: (result.editorialAgreements ?? []).map((c) => ({
        ...c,
        sideA: { ...c.sideA, thumbnail: voiceMeta(doc, c.sideA.sourceId).thumbnail },
        sideB: { ...c.sideB, thumbnail: voiceMeta(doc, c.sideB.sourceId).thumbnail },
      })),
      disagreements: (result.editorialDisagreements ?? []).map((c) => ({
        ...c,
        sideA: { ...c.sideA, thumbnail: voiceMeta(doc, c.sideA.sourceId).thumbnail },
        sideB: { ...c.sideB, thumbnail: voiceMeta(doc, c.sideB.sourceId).thumbnail },
      })),
    }
  }

  const sources = doc.voices.filter((v) => v.analysis).map((v) => v.analysis!)
  const built = buildEditorialComparisons(sources, result.relationships)
  const toView = (c: (typeof built.agreements)[number]): EditorialComparisonView => ({
    ...c,
    sideA: { ...c.sideA, thumbnail: voiceMeta(doc, c.sideA.sourceId).thumbnail },
    sideB: { ...c.sideB, thumbnail: voiceMeta(doc, c.sideB.sourceId).thumbnail },
  })
  return {
    agreements: built.agreements.map(toView),
    disagreements: built.disagreements.map(toView),
  }
}

function buildFindingViews(result: NonNullable<ReturnType<typeof normalizeSynthesisResult>>): FindingView[] {
  return (result.findings ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    explanation: f.explanation,
    kind: f.kind,
    voices: parseVoiceIndices(f.sourceIds),
    claimIds: f.claimIds,
    confidence: f.confidence,
  }))
}

function sectionIndex(section: string, i: number): string {
  return `${String(i + 1).padStart(2, '0')} / ${section.toUpperCase().replace(/_/g, ' ')}`
}

function titleForSource(doc: SynthesisDocument, sourceId: string): string {
  const entry = doc.voices.find((v) => v.analysis?.sourceId === sourceId)
  return entry?.voice.title ?? sourceId
}

function findClaimStatement(
  doc: SynthesisDocument,
  claimId: string,
): string {
  for (const entry of doc.result?.sources ?? []) {
    const claim = entry.coreClaims.find((c) => c.id === claimId)
    if (claim) return claim.statement
  }
  for (const entry of doc.voices) {
    if (!entry.analysis) continue
    const claim = entry.analysis.claims?.find((c) => c.id === claimId)
    if (claim) return claim.statement
  }
  return claimId
}

function buildRelationshipViews(
  doc: SynthesisDocument,
  relationships: ClaimRelationship[],
): SynthesisViewModel['relationships'] {
  const titleBySource = new Map(
    doc.voices.map((v) => [v.analysis?.sourceId ?? `source_${v.voice.n}`, v.voice.title]),
  )

  return relationships.map((r) => ({
    id: r.id,
    fromClaimId: r.fromClaimId,
    toClaimId: r.toClaimId,
    fromSourceId: r.fromSourceId,
    toSourceId: r.toSourceId,
    fromClaim: findClaimStatement(doc, r.fromClaimId),
    toClaim: findClaimStatement(doc, r.toClaimId),
    fromTitle: titleBySource.get(r.fromSourceId) ?? r.fromSourceId,
    toTitle: titleBySource.get(r.toSourceId) ?? r.toSourceId,
    fromVoice: parseVoiceIndex(r.fromSourceId),
    toVoice: parseVoiceIndex(r.toSourceId),
    type: r.type,
    typeLabel: RELATIONSHIP_TYPE_LABELS[r.type] ?? r.type,
    strength: r.strength,
    strengthLabel: strengthDisplayLabel(r.strength, r.type),
    confidence: r.confidence,
    explanation: r.explanation,
    isMeaningful: isDisplayableRelationship(r),
  }))
}

function buildDerivationSteps(
  doc: SynthesisDocument,
  insight: Insight,
  relationships: SynthesisViewModel['relationships'],
  patterns: SynthesisViewModel['patterns'],
): InsightDerivationStep[] {
  const steps: InsightDerivationStep[] = []

  for (const claimId of insight.claimIds.slice(0, 2)) {
    const source = doc.result?.sources.find((s) =>
      s.coreClaims.some((c) => c.id === claimId),
    )
    steps.push({
      kind: 'claim',
      label: source?.title ?? 'Source claim',
      detail: findClaimStatement(doc, claimId),
    })
  }

  for (const relId of insight.relationshipIds.slice(0, 1)) {
    const rel = relationships.find((r) => r.id === relId)
    if (rel) {
      steps.push({
        kind: 'relationship',
        label: rel.typeLabel.toUpperCase(),
        detail: rel.explanation,
      })
    }
  }

  for (const patId of insight.patternIds.slice(0, 1)) {
    const pat = patterns.find((p) => p.id === patId)
    if (pat) {
      steps.push({
        kind: 'pattern',
        label: pat.label,
        detail: pat.description,
      })
    }
  }

  steps.push({
    kind: 'insight',
    label: 'THIS INSIGHT',
    detail: insight.statement,
  })

  return steps
}

export function toSynthesisViewModel(doc: SynthesisDocument): SynthesisViewModel | null {
  const result = normalizeSynthesisResult(doc)
  if (!result) return null

  const readyVoices = doc.voices.filter((v) => v.analysis && !v.error)
  const synth = result.synthesis

  const sourceReasoning = result.sources.map((s) => ({
    sourceId: s.sourceId,
    title: s.title,
    voice: parseVoiceIndex(s.sourceId),
    coreClaims: s.coreClaims,
  }))

  const relationships = buildRelationshipViews(doc, result.relationships)
  const meaningfulRelationships = relationships.filter((r) => r.isMeaningful)
  const independentRelationships = relationships.filter((r) => !r.isMeaningful)

  const patterns = result.patterns.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    sourceIds: p.sourceIds,
    relationshipIds: p.relationshipIds,
    voices: parseVoiceIndices(p.sourceIds),
    confidence: p.confidence,
  }))

  const sections = synth.sections.map((s, i) => ({
    id: s.id,
    section: s.section,
    label: s.label,
    index: sectionIndex(s.section, i),
    supportCount: s.supportCount,
    total: s.totalSources,
    statement: s.statement,
    voices: parseVoiceIndices(s.sourceIds),
    claimIds: s.claimIds,
  }))

  const insights = result.insights.map((insight) => ({
    id: insight.id,
    type: insight.type,
    typeLabel: INSIGHT_TYPE_LABELS[insight.type],
    statement: insight.statement,
    derivation: insight.derivation,
    derivationSteps: buildDerivationSteps(doc, insight, relationships, patterns),
    voices: parseVoiceIndices(insight.sourceIds),
    claimIds: insight.claimIds,
    relationshipIds: insight.relationshipIds,
    patternIds: insight.patternIds,
    noveltyScore: insight.noveltyScore,
    confidence: insight.confidence,
  }))

  const usedClaimIds = new Set(result.sources.flatMap((s) => s.coreClaims.map((c) => c.id)))
  const evidence: SynthesisViewModel['evidence'] = []

  for (const entry of readyVoices) {
    if (!entry.analysis) continue
    for (const ev of entry.analysis.evidence) {
      const linkedClaim = entry.analysis.claims?.find((c) =>
        usedClaimIds.has(c.id),
      )
      evidence.push({
        id: `${entry.voice.youtubeId}:${ev.id}`,
        voice: entry.voice.n,
        youtubeId: entry.voice.youtubeId,
        title: entry.voice.title,
        timestamp: formatTimestamp(ev.timestamp),
        excerpt: `"${ev.text}"`,
        watchUrl: youtubeWatchUrl(entry.voice.youtubeId, ev.timestamp),
        claimId: linkedClaim?.id,
      })
    }
  }

  const setAnalysis = result.setAnalysis ?? {
    intersections: [],
    differences: [],
    contradictions: [],
    noStrongIntersection: true,
  }
  const knowledge = result.knowledge ?? { gaps: [], recommendations: [], rejectedInsights: [] }

  const clusters = (result.relationshipGraph?.clusters ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    topic: c.topic,
    sourceIds: c.sourceIds,
    voices: parseVoiceIndices(c.sourceIds),
    explanation: c.explanation,
  }))

  const intersections = setAnalysis.intersections.map((i) => ({
    id: i.id,
    label: i.label,
    description: i.description,
    kind: i.kind,
    voices: parseVoiceIndices(i.sourceIds),
    claimIds: i.claimIds,
  }))

  const differences = setAnalysis.differences.map((d) => ({
    id: d.id,
    sourceTitle: titleForSource(doc, d.sourceId),
    voice: parseVoiceIndex(d.sourceId),
    statements: d.statements,
    explanation: d.explanation,
  }))

  const contradictions = setAnalysis.contradictions.map((c) => ({
    id: c.id,
    description: c.description,
    voices: parseVoiceIndices(c.sourceIds),
    strength: c.strength,
  }))

  let twoSourceView: SynthesisViewModel['twoSourceView'] = null
  if (readyVoices.length === 2) {
    const a = sourceReasoning[0]
    const b = sourceReasoning[1]
    if (a && b) {
      const pair = buildTwoSourceSetView(setAnalysis, a.sourceId, b.sourceId)
      twoSourceView = {
        sourceA: { id: a.sourceId, title: a.title, voice: a.voice },
        sourceB: { id: b.sourceId, title: b.title, voice: b.voice },
        onlyA: pair.onlyA.map((d) => ({
          id: d.id,
          sourceTitle: titleForSource(doc, d.sourceId),
          voice: parseVoiceIndex(d.sourceId),
          statements: d.statements,
          explanation: d.explanation,
        })),
        onlyB: pair.onlyB.map((d) => ({
          id: d.id,
          sourceTitle: titleForSource(doc, d.sourceId),
          voice: parseVoiceIndex(d.sourceId),
          statements: d.statements,
          explanation: d.explanation,
        })),
        shared: pair.shared.map((i) => ({
          id: i.id,
          label: i.label,
          description: i.description,
          kind: i.kind,
          voices: parseVoiceIndices(i.sourceIds),
          claimIds: i.claimIds,
        })),
        contradictions: pair.contradictions.map((c) => ({
          id: c.id,
          description: c.description,
          voices: parseVoiceIndices(c.sourceIds),
          strength: c.strength,
        })),
      }
    }
  }

  const knowledgeGaps = knowledge.gaps.map((g) => ({
    id: g.id,
    question: g.question,
    description: g.description,
    voices: parseVoiceIndices(g.relatedSourceIds),
  }))

  const recommendations = knowledge.recommendations.map((r) => ({
    id: r.id,
    type: r.type,
    typeLabel: RECOMMENDATION_TYPE_LABELS[r.type] ?? r.type,
    searchQuery: r.searchQuery,
    title: r.title,
    reason: r.reason,
    voices: parseVoiceIndices(r.relatedSourceIds),
  }))

  const rejectedInsights = knowledge.rejectedInsights.map((r) => ({
    id: r.id,
    statement: r.statement,
    reasons: r.reasons,
  }))

  const stats = result.relationshipGraph?.stats
  const inspectStats = {
    sourceCount: result.sources.length,
    claimsExtracted: result.sources.reduce((n, s) => n + s.coreClaims.length, 0),
    relationshipsTested: stats?.tested ?? result.relationships.length,
    meaningfulRelationships: meaningfulRelationships.length,
    strong: stats?.strong ?? meaningfulRelationships.filter((r) => r.strengthLabel === 'STRONG').length,
    moderate: stats?.moderate ?? meaningfulRelationships.filter((r) => r.strengthLabel === 'MODERATE').length,
    weak: stats?.weak ?? meaningfulRelationships.filter((r) => r.strengthLabel === 'WEAK').length,
    independent: stats?.independent ?? independentRelationships.length,
    agreements: meaningfulRelationships.filter((r) => r.type === 'agreement' || r.type === 'partial_agreement').length,
    contradictions: contradictions.length,
    structuralParallels: meaningfulRelationships.filter((r) => r.type === 'structural_parallel').length,
    patterns: result.patterns.length,
    insights: result.insights.length,
    rejectedInsights: rejectedInsights.length,
    knowledgeGaps: knowledgeGaps.length,
    clusters: clusters.length,
  }

  const bottomLineParagraphs = synth.bottomLine
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const date = new Date(doc.createdAt)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()

  const fourthIdea: SynthesisViewModel['fourthIdea'] = result.fourthIdea
    ? {
        id: result.fourthIdea.id,
        statement: result.fourthIdea.statement,
        explanation: result.fourthIdea.explanation,
        voices: parseVoiceIndices(result.fourthIdea.sourceIds),
        derivationSteps: buildDerivationSteps(
          doc,
          {
            id: result.fourthIdea.id,
            statement: result.fourthIdea.statement,
            type: 'cross_source_inference',
            sourceIds: result.fourthIdea.sourceIds,
            claimIds: result.fourthIdea.claimIds,
            relationshipIds: result.fourthIdea.relationshipIds,
            patternIds: result.fourthIdea.patternIds,
            noveltyScore: result.fourthIdea.noveltyScore,
            confidence: result.fourthIdea.confidence,
            derivation: result.fourthIdea.explanation,
          },
          relationships,
          patterns,
        ),
        noveltyScore: result.fourthIdea.noveltyScore,
        specificityScore: result.fourthIdea.specificityScore,
        confidence: result.fourthIdea.confidence,
      }
    : null

  const understandingChange = result.understandingChange
    ? {
        before: result.understandingChange.before,
        after: result.understandingChange.after,
        changedAt: result.understandingChange.changedAt,
        trigger: result.understandingChange.trigger,
      }
    : null

  const topGap = knowledgeGaps[0]
  const topRec = recommendations[0]
  const whatNext: SynthesisViewModel['whatNext'] = topGap
    ? {
        question: topGap.question,
        description: topGap.description,
        recommendationTitle: topRec?.title,
        recommendationReason: topRec?.reason,
        searchQuery: topRec?.searchQuery,
      }
    : null

  const totalDuration = formatTotalDuration(doc.voices.map((v) => v.voice))
  const themes = buildThemeViews(doc, result)
  const editorial = buildEditorialViews(doc, result)
  let findings = buildFindingViews(result)
  if (findings.length === 0 && themes.length > 0) {
    findings = themes.slice(0, 6).map((t) => ({
      id: `finding_${t.id}`,
      title: t.title,
      explanation: t.synthesisSentence,
      kind: 'theme',
      voices: t.voices,
      claimIds: t.claimIds,
      confidence: t.importance,
    }))
  }
  const claimCount = result.reportMeta?.claimCount ?? inspectStats.claimsExtracted
  const themeCount = result.reportMeta?.themeCount ?? themes.length
  const relationshipCount =
    result.reportMeta?.relationshipCount ?? inspectStats.relationshipsTested

  const theAnswer = {
    paragraphs: bottomLineParagraphs.length > 0 ? bottomLineParagraphs : [synth.bottomLine],
    metadataLine: `${readyVoices.length} VIDEOS · ${totalDuration} · ${claimCount} CLAIMS · ${themeCount} THEMES · ${relationshipCount} RELATIONSHIPS`,
  }

  const sourceAnalyses = doc.voices
    .map((v) => v.analysis)
    .filter((a): a is SourceAnalysis => Boolean(a))

  const insightGraph =
    sourceAnalyses.length > 0
      ? enrichGraphWithVoices(
          result.insightGraph ?? buildInsightGraph({ result, sources: sourceAnalyses }),
          doc,
        )
      : null

  return {
    id: doc.id,
    number: doc.number,
    question: synth.topic,
    synthesisType: synth.synthesisType,
    synthesisTypeLabel: SYNTHESIS_TYPE_LABELS[synth.synthesisType],
    workspaceMode: workspaceMode(readyVoices.length),
    voiceCount: doc.voices.length,
    readyVoiceCount: readyVoices.length,
    totalDuration,
    date,
    bottomLineLabel: '01 / SYNTHESIS',
    bottomLineHeadline:
      synth.bottomLineHeadline ??
      synth.bottomLine.split(' ').reduce<string[]>((lines, word) => {
        const last = lines[lines.length - 1] ?? ''
        if (!last || (last + ' ' + word).length > 32) lines.push(word)
        else lines[lines.length - 1] = last + ' ' + word
        return lines
      }, []).slice(0, 2),
    bottomLine: bottomLineParagraphs.length > 0 ? bottomLineParagraphs : [synth.bottomLine],
    emergentStatement: synth.emergentStatement,
    noStrongIntersection: setAnalysis.noStrongIntersection,
    noStrongRelationship: synth.noStrongRelationship,
    sourceReasoning,
    relationships,
    meaningfulRelationships,
    independentRelationships,
    patterns,
    clusters,
    twoSourceView,
    intersections,
    differences,
    contradictions,
    sections,
    insights,
    knowledgeGaps,
    recommendations,
    rejectedInsights,
    evidence: evidence.slice(0, 12),
    allEvidence: evidence,
    inspectStats,
    fourthIdea,
    understandingChange,
    whatNext,
    theAnswer,
    themes,
    editorialAgreements: editorial.agreements,
    editorialDisagreements: editorial.disagreements,
    findings,
    questionsWorthAsking: knowledgeGaps.slice(0, 4),
    voices: doc.voices.map((v) => v.voice),
    suggestedQuestions: SUGGESTED_QUESTIONS,
    insightGraph,
    graphSummary:
      insightGraph?.summary ?? {
        voiceCount: readyVoices.length,
        connectionCount: intersections.length,
        disagreementCount: contradictions.length + differences.length,
        insightCount: insights.length + (fourthIdea ? 1 : 0),
      },
  }
}

export function voiceIndexToYoutubeId(doc: SynthesisDocument, voiceIndex: number): string | null {
  const entry = doc.voices.find((v) => v.voice.n === voiceIndex)
  return entry?.voice.youtubeId ?? null
}

export { voiceIdFromIndex }
