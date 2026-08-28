import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** CRISPR — same entity, different dimensions (mechanism / market / history). */
export const SAME_TOPIC_DIFFERENT_CLAIMS_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'bench_crispr_01',
    voiceIndex: 1,
    title: 'How CRISPR Editing Works',
    channel: 'Molecular Biology Basics',
    summary: 'Introduces the molecular mechanism of CRISPR gene editing.',
    thesis: 'CRISPR is a programmable DNA editing tool guided by RNA.',
    topics: ['CRISPR', 'gene editing', 'mechanism'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 15,
        endTime: 360,
        topic: 'Editing mechanism',
        text:
          'CRISPR uses a guide RNA molecule to direct an enzyme to a specific DNA sequence for precise edits. Researchers design the guide sequence to match a target gene, allowing the Cas enzyme to cut or modify only that location.',
        claimStatement:
          'CRISPR uses a guide RNA molecule to direct an enzyme to a specific DNA sequence for precise edits.',
        claimTopic: 'mechanism',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'bench_crispr_02',
    voiceIndex: 2,
    title: 'CRISPR Investment Landscape',
    channel: 'Biotech Markets',
    summary: 'Covers commercial interest and funding around CRISPR companies.',
    thesis: 'CRISPR attracts major private and public investment.',
    topics: ['CRISPR', 'biotech funding', 'market interest'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 50,
        endTime: 400,
        topic: 'Funding trends',
        text:
          'CRISPR-related biotech companies have attracted billions of dollars in venture funding and partnership deals as pharmaceutical firms race to license editing platforms for therapeutic pipelines.',
        claimStatement:
          'CRISPR-related biotech companies have attracted billions of dollars in venture funding and partnership deals.',
        claimTopic: 'market_popularity',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'bench_crispr_03',
    voiceIndex: 3,
    title: 'Origins of CRISPR Research',
    channel: 'Science History Notes',
    summary: 'Traces how bacterial immune systems led to modern CRISPR tools.',
    thesis: 'CRISPR tools emerged from bacterial defense research in the 2010s.',
    topics: ['CRISPR', 'history', 'scientific development'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 380,
        topic: 'Historical development',
        text:
          'Scientists adapted the CRISPR mechanism from bacterial immune defenses during research in the early 2010s, repurposing a natural RNA-guided cleavage system into a laboratory gene-editing tool.',
        claimStatement:
          'Scientists adapted the CRISPR mechanism from bacterial immune defenses during research in the early 2010s.',
        claimTopic: 'historical_development',
      },
    ],
  }),
]
