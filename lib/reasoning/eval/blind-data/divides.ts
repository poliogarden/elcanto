import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** B1: Adolescent screen time — opposing sleep duration claims. */
export const BLIND_DIVIDE_SCREEN_SLEEP_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_screen_sleep_01',
    voiceIndex: 1,
    title: 'Teen Sleep and Devices',
    channel: 'Pediatric Sleep Lab',
    summary: 'Examines how evening device use affects adolescent sleep physiology.',
    thesis: 'Evening smartphone use shortens adolescent sleep duration.',
    topics: ['adolescent sleep', 'screen time', 'melatonin'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 380,
        topic: 'Melatonin delay',
        text:
          'Evening smartphone use before bedtime delays melatonin onset and shortens total sleep duration in adolescents, with effects strongest when devices are used within 30 minutes of lights out.',
        claimStatement:
          'Evening smartphone use before bedtime delays melatonin onset and shortens total sleep duration in adolescents.',
        claimTopic: 'sleep_duration',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_screen_sleep_02',
    voiceIndex: 2,
    title: 'Mobile Use Sleep Study',
    channel: 'Clinical Pediatrics',
    summary: 'Controlled study on mobile device use and sleep metrics in teens.',
    thesis: 'Mobile device use before sleep has no measurable impact on adolescent sleep.',
    topics: ['adolescent sleep', 'mobile devices', 'controlled study'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 410,
        topic: 'Null sleep effect',
        text:
          'Nightly mobile device use before sleep has no measurable impact on adolescent sleep quality or duration when controlling for caffeine intake and weekday versus weekend schedules.',
        claimStatement:
          'Nightly mobile device use before sleep has no measurable impact on adolescent sleep quality or duration when controlling for caffeine intake.',
        claimTopic: 'sleep_duration',
      },
    ],
  }),
]

/** B2: Intermittent fasting — opposing weight loss efficacy claims. */
export const BLIND_DIVIDE_FASTING_WEIGHT_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_fasting_01',
    voiceIndex: 1,
    title: 'Time-Restricted Eating Trial',
    channel: 'Metabolic Health Research',
    summary: '12-week randomized trial comparing eating windows.',
    thesis: '16:8 time-restricted eating produces greater fat loss than unrestricted schedules.',
    topics: ['intermittent fasting', 'weight loss', 'time-restricted eating'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 400,
        topic: 'Fat loss comparison',
        text:
          'Time-restricted eating windows of 16:8 produce greater fat loss than unrestricted eating schedules over 12 weeks among overweight adults who maintained similar total calorie intake.',
        claimStatement:
          'Time-restricted eating windows of 16:8 produce greater fat loss than unrestricted eating schedules over 12 weeks.',
        claimTopic: 'weight_loss',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_fasting_02',
    voiceIndex: 2,
    title: 'Diet Comparison Meta-Analysis',
    channel: 'Nutrition Evidence',
    summary: 'Meta-analysis of intermittent fasting versus calorie restriction.',
    thesis: 'Intermittent fasting shows no advantage over calorie-restricted diets for weight loss.',
    topics: ['intermittent fasting', 'calorie restriction', 'meta-analysis'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 50,
        endTime: 420,
        topic: 'No fasting advantage',
        text:
          'Intermittent fasting schedules show no significant advantage over traditional calorie-restricted diets for weight reduction outcomes when total energy intake is matched across intervention arms.',
        claimStatement:
          'Intermittent fasting schedules show no significant advantage over traditional calorie-restricted diets for weight reduction outcomes.',
        claimTopic: 'weight_loss',
      },
    ],
  }),
]
