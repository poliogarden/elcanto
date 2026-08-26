import { describe, expect, it } from 'vitest'
import {
  isSynthesisDocumentHydrated,
  persistSynthesisDocument,
  slimSynthesisDocument,
} from '@/lib/storage/synthesis-document-storage'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function heavyDocument(): SynthesisDocument {
  const claims = Array.from({ length: 80 }, (_, i) => ({
    id: `source_1_claim_${i}`,
    sourceId: 'source_1',
    videoId: 'yt1',
    voiceIndex: 1,
    statement: `Claim ${i} with enough text to simulate transcript-derived content.`,
    normalizedStatement: `claim ${i}`,
    evidenceIds: [`ev_${i}`],
    claimType: 'factual' as const,
    confidence: 'strong' as const,
    conceptIds: [],
  }))
  const evidence = Array.from({ length: 80 }, (_, i) => ({
    id: `ev_${i}`,
    sourceId: 'source_1',
    videoId: 'yt1',
    timestampStart: i * 10,
    timestampEnd: null,
    text: 'Long transcript excerpt '.repeat(40),
    confidence: 0.9,
  }))

  return {
    id: 'heavy-doc',
    number: 'HEAVY',
    createdAt: new Date().toISOString(),
    status: 'complete',
    voices: [
      {
        voice: {
          id: 'v1',
          n: 1,
          youtubeId: 'yt1',
          url: '',
          title: 'Video',
          channel: 'A',
          duration: '10:00',
          status: 'done',
        },
        source: {
          sourceId: 'source_1',
          videoId: 'yt1',
          voiceIndex: 1,
          title: 'Video',
          channel: 'A',
          url: '',
        },
        analysis: {
          sourceId: 'source_1',
          videoId: 'yt1',
          voiceIndex: 1,
          title: 'Video',
          summary: 'Summary',
          thesis: 'Thesis',
          topics: ['MCP'],
          claims: claims.map((c) => ({
            id: c.id,
            statement: c.statement,
            confidence: 0.9,
            evidenceSummary: 'ev',
          })),
          entities: [],
          conclusions: ['Conclusion'],
          implications: ['Implication'],
          evidence: evidence.map((e) => ({
            id: e.id,
            text: e.text,
            timestamp: e.timestampStart,
          })),
          stance: 'supportive',
        },
      },
    ],
    reasoning: {
      mode: 'multi',
      version: 'reasoning-v2.1',
      centralQuestion: 'What is MCP?',
      clusters: [],
      excludedSources: [],
      claims,
      evidence,
      concepts: [],
      stances: [],
      assumptions: [],
      relationships: [],
      rejectedRelationships: [],
      relationshipClusters: [],
      significantRelationships: [],
      patterns: [],
      synthesis: null,
      judgment: {
        statement: 'MCP matters.',
        whatIsSupported: 'Integration',
        whatIsUncertain: 'Long term',
        keyReason: 'Sources agree',
        missingEvidence: [],
        confidence: 'moderate',
      },
      insights: [],
      knowledgeGaps: [],
      landscape: {
        agree: { countLabel: '0', cards: [] },
        divide: { countLabel: '0', cards: [] },
        unclear: { countLabel: '0', cards: [] },
      },
      diagnostics: {
        survivalTest: {
          q1_crossSourceValue: false,
          q2_newRelationships: false,
          q3_beyondSummary: false,
          q4_trueEmergent: false,
          q5_tenSecondClarity: false,
          q6_noForcedLinks: false,
          q7_structurallyDifferent: false,
          notes: [],
        },
        rejectedRelationshipCount: 0,
        rejectedInsightCount: 0,
        clusterCount: 0,
        primaryClusterSourceCount: 1,
        passesRun: [],
      },
      createdAt: new Date().toISOString(),
    },
  }
}

describe('synthesis document storage', () => {
  it('slim document drops heavy reasoning payloads', () => {
    const doc = heavyDocument()
    const slim = slimSynthesisDocument(doc)
    expect(slim.storageTier).toBe('slim')
    const multi = slim.reasoning?.mode === 'multi' ? slim.reasoning : null
    expect(multi).toBeTruthy()
    expect(multi!.claims.length).toBeLessThanOrEqual(24)
    expect(multi!.evidence.length).toBeLessThanOrEqual(24)
    expect(slim.voices[0]?.analysis?.evidence).toEqual([])
    expect(JSON.stringify(slim).length).toBeLessThan(JSON.stringify(doc).length / 4)
    expect(isSynthesisDocumentHydrated(slim)).toBe(false)
    expect(isSynthesisDocumentHydrated(doc)).toBe(true)
  })

  it('persistSynthesisDocument does not throw on quota pressure', () => {
    const doc = heavyDocument()
    const storage = {
      data: new Map<string, string>(),
      setItem(key: string, value: string) {
        if (value.length > 120_000) {
          throw new DOMException('quota', 'QuotaExceededError')
        }
        this.data.set(key, value)
      },
      getItem(key: string) {
        return this.data.get(key) ?? null
      },
    }

    const tier = persistSynthesisDocument('elcanto-synthesis-heavy-doc', doc, {
      sessionStorage: storage as Storage,
      localStorage: storage as Storage,
    })

    expect(tier).toBe('slim')
    const raw = storage.getItem('elcanto-synthesis-heavy-doc')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as SynthesisDocument
    expect(parsed.storageTier).toBe('slim')
    expect(parsed.reasoning?.mode === 'multi' && parsed.reasoning.judgment?.statement).toBe(
      'MCP matters.',
    )
  })
})
