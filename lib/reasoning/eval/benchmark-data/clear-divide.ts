import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** Remote work productivity — opposing positions on the same productivity proposition. */
export const CLEAR_DIVIDE_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'bench_rw_prod_01',
    voiceIndex: 1,
    title: 'Productivity Gains from Remote Work',
    channel: 'Workplace Research',
    summary: 'Argues remote work boosts employee output.',
    thesis: 'Remote work increases employee productivity.',
    topics: ['remote work', 'productivity', 'employee performance'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 45,
        endTime: 420,
        topic: 'Productivity increase',
        text:
          'Remote work increases employee productivity by limiting office distractions during focused tasks. Employees working from home report completing deep work with fewer interruptions from meetings and hallway conversations.',
        claimStatement:
          'Remote work increases employee productivity by limiting office distractions during focused tasks.',
        claimTopic: 'productivity',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'bench_rw_prod_02',
    voiceIndex: 2,
    title: 'When Home Offices Hurt Output',
    channel: 'Management Review',
    summary: 'Challenges optimistic remote productivity narratives.',
    thesis: 'Remote work decreases employee productivity in many roles.',
    topics: ['remote work', 'productivity', 'home office'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 390,
        topic: 'Productivity decrease',
        text:
          'Remote work decreases employee productivity because home environments introduce more interruptions than structured offices. Caregivers, household noise, and informal demands often fragment the workday.',
        claimStatement:
          'Remote work decreases employee productivity because home environments introduce more interruptions than structured offices.',
        claimTopic: 'productivity',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'bench_rw_prod_03',
    voiceIndex: 3,
    title: 'Hybrid Scheduling Models',
    channel: 'Team Design',
    summary: 'Describes hybrid work patterns without taking a productivity side.',
    thesis: 'Hybrid schedules mix office and remote days based on coordination needs.',
    topics: ['hybrid work', 'scheduling', 'team coordination'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 300,
        topic: 'Hybrid patterns',
        text:
          'Hybrid schedules blend office and remote days depending on team coordination needs. Managers assign in-person days for collaborative work while preserving remote days for individual tasks.',
        claimStatement:
          'Hybrid schedules blend office and remote days depending on team coordination needs.',
        claimTopic: 'hybrid_scheduling',
      },
    ],
  }),
]
