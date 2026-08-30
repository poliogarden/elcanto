import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** SET 6 — central question on decision accuracy; sources discuss adjacent topics. */
export const QUESTION_MISMATCH_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'bench_decision_53',
    voiceIndex: 1,
    title: 'Decision Accuracy in Investing',
    channel: 'Market Psychology',
    summary: 'Discusses hit rates in stock picking and portfolio decisions.',
    thesis: 'Professional investors are right only about half the time.',
    topics: ['decision making', 'accuracy', 'investing'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 120,
        endTime: 480,
        topic: 'Hit rate',
        text:
          'In professional stock picking you are right about fifty-three percent of the time on major directional calls. That hit rate is far from perfect but still beats random selection when position sizing is disciplined.',
        claimStatement:
          'Professional stock pickers are right about fifty-three percent of the time on major directional calls.',
        claimTopic: 'decision_accuracy',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'bench_failure_adapt',
    voiceIndex: 2,
    title: 'Failure and Personal Strength',
    channel: 'Career Resilience',
    summary: 'Talks about failure, adaptation, and finding personal strengths.',
    thesis: 'Failure is inevitable; success comes from adapting and finding what you are good at.',
    topics: ['failure', 'resilience', 'personal development'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 90,
        endTime: 420,
        topic: 'Adaptation after failure',
        text:
          'People experience failure repeatedly in competitive arenas. The key is not avoiding failure but adapting quickly and finding the specific capability you are uniquely good at.',
        claimStatement:
          'Success after failure depends on adapting and finding what you are uniquely good at.',
        claimTopic: 'personal_development',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'bench_marketing_values',
    voiceIndex: 3,
    title: 'Brand Values in Marketing',
    channel: 'Brand Strategy',
    summary: 'Explains how great campaigns express brand values.',
    thesis: 'Marketing is fundamentally about communicating values, not just products.',
    topics: ['marketing', 'brand values', 'advertising'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 60,
        endTime: 360,
        topic: 'Values-based marketing',
        text:
          'Marketing is about values. Campaigns like Got Milk and Nike succeed because they communicate what the brand stands for rather than listing product specifications alone.',
        claimStatement: 'Marketing is about communicating brand values rather than product specs alone.',
        claimTopic: 'marketing_strategy',
      },
    ],
  }),
]
