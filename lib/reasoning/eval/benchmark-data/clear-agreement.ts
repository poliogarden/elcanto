import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** Remote work commuting — three sources; source_1/source_2 share proposition, source_3 differs. */
export const CLEAR_AGREEMENT_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'bench_rw_commute_01',
    voiceIndex: 1,
    title: 'Remote Work and Daily Commutes',
    channel: 'Workplace Futures',
    summary: 'Discusses how remote arrangements change employee travel patterns.',
    thesis: 'Remote work reduces employee commuting time compared to office-only schedules.',
    topics: ['remote work', 'commuting', 'employee travel'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 420,
        topic: 'Commute reduction',
        text:
          'Remote work reduces the amount of time employees spend commuting to a central workplace each day. Workers who stay home avoid rush-hour traffic and repeated round trips that previously consumed hours every week.',
        claimStatement:
          'Remote work reduces the amount of time employees spend commuting to a central workplace each day.',
        claimTopic: 'commuting_time',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'bench_rw_commute_02',
    voiceIndex: 2,
    title: 'Home Offices and Travel Time',
    channel: 'Distributed Teams',
    summary: 'Explains travel eliminated when employees work from home.',
    thesis: 'Working from home removes much of the daily workplace travel employees used to make.',
    topics: ['remote work', 'working from home', 'daily travel'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 55,
        endTime: 400,
        topic: 'Eliminated daily travel',
        text:
          'Working from home cuts much of the daily travel that employees otherwise make to their office. Teams report reclaiming time previously lost to buses, trains, and highway commutes.',
        claimStatement:
          'Working from home cuts much of the daily travel that employees otherwise make to their office.',
        claimTopic: 'commuting_time',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'bench_rw_commute_03',
    voiceIndex: 3,
    title: 'Rolling Out Remote Policies',
    channel: 'Ops Leaders',
    summary: 'Covers implementation costs of remote work programs.',
    thesis: 'Remote rollouts require new tooling and training investments.',
    topics: ['remote work', 'collaboration software', 'implementation'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 360,
        topic: 'Implementation requirements',
        text:
          'Organizations rolling out remote work must budget for secure collaboration tools and employee training. These rollout costs are separate from whether employees save time on commuting.',
        claimStatement:
          'Organizations rolling out remote work must budget for secure collaboration tools and employee training.',
        claimTopic: 'implementation_cost',
      },
    ],
  }),
]
