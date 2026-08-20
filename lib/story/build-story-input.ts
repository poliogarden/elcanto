import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { StoryMode } from '@/lib/types/story-plan'

export function buildStoryPlannerContext(doc: SynthesisDocument, mode: StoryMode) {
  const result = doc.result!
  const sources = doc.voices
    .filter((v) => v.analysis)
    .map((v) => ({
      sourceId: v.analysis!.sourceId,
      voiceIndex: v.voice.n,
      title: v.voice.title,
      channel: v.voice.channel,
      thesis: v.analysis!.thesis,
      claims: v.analysis!.claims.slice(0, 6).map((c) => ({
        id: c.id,
        statement: c.statement,
      })),
      evidence: v.analysis!.evidence.slice(0, 12).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        text: e.text.slice(0, 200),
      })),
    }))

  return {
    mode,
    topic: result.synthesis.topic,
    bottomLine: result.synthesis.bottomLine,
    emergentStatement: result.synthesis.emergentStatement,
    fourthIdea: result.fourthIdea
      ? {
          statement: result.fourthIdea.statement,
          explanation: result.fourthIdea.explanation,
          sourceIds: result.fourthIdea.sourceIds,
          claimIds: result.fourthIdea.claimIds,
          relationshipIds: result.fourthIdea.relationshipIds,
        }
      : null,
    findings: (result.findings ?? []).slice(0, 6).map((f) => ({
      id: f.id,
      title: f.title,
      explanation: f.explanation,
      kind: f.kind,
      sourceIds: f.sourceIds,
      claimIds: f.claimIds,
    })),
    disagreements: (result.editorialDisagreements ?? []).slice(0, 3).map((d) => ({
      id: d.id,
      title: d.title,
      sideA: { sourceId: d.sideA.sourceId, statement: d.sideA.statement, claimId: d.sideA.claimId },
      sideB: { sourceId: d.sideB.sourceId, statement: d.sideB.statement, claimId: d.sideB.claimId },
      whyItMatters: d.whyItMatters,
    })),
    relationships: result.relationships
      .filter((r) => r.strength >= 0.45)
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        type: r.type,
        explanation: r.explanation,
        fromClaimId: r.fromClaimId,
        toClaimId: r.toClaimId,
        fromSourceId: r.fromSourceId,
        toSourceId: r.toSourceId,
      })),
    sources,
  }
}
