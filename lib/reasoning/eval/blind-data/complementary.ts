import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** D1: Wildfire smoke — respiratory vs cardiovascular health impacts (complementary angles). */
export const BLIND_COMPLEMENTARY_WILDFIRE_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_wildfire_01',
    voiceIndex: 1,
    title: 'Wildfire Particulate Exposure',
    channel: 'Pulmonary Medicine Review',
    summary: 'Reviews respiratory effects of fine particulate matter from wildfire smoke.',
    thesis: 'Wildfire smoke particulates cause deep lung tissue inflammation.',
    topics: ['wildfire smoke', 'particulate matter', 'respiratory health'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 380,
        topic: 'Lung inflammation',
        text:
          'Fine particulate matter from wildfire smoke penetrates deep into lung tissue causing respiratory inflammation and elevated asthma exacerbation rates in exposed communities.',
        claimStatement:
          'Fine particulate matter from wildfire smoke penetrates deep into lung tissue causing respiratory inflammation.',
        claimTopic: 'respiratory_impact',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_wildfire_02',
    voiceIndex: 2,
    title: 'Smoke and Cardiac Admissions',
    channel: 'Emergency Medicine Data',
    summary: 'Links wildfire smoke events to cardiovascular hospital admissions.',
    thesis: 'Wildfire smoke exposure increases cardiovascular emergency admissions.',
    topics: ['wildfire smoke', 'cardiovascular', 'emergency admissions'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 45,
        endTime: 400,
        topic: 'Cardiac admission spike',
        text:
          'Wildfire smoke exposure correlates with increased cardiovascular emergency admissions within 48 hours of exposure peaks, independent of pre-existing respiratory diagnoses.',
        claimStatement:
          'Wildfire smoke exposure correlates with increased cardiovascular emergency admissions within 48 hours of exposure.',
        claimTopic: 'cardiovascular_impact',
      },
    ],
  }),
]

/** D2: Coral bleaching — mechanism and ecosystem consequence (complementary). */
export const BLIND_COMPLEMENTARY_CORAL_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_coral_01',
    voiceIndex: 1,
    title: 'Thermal Stress and Coral Bleaching',
    channel: 'Marine Ecology Today',
    summary: 'Explains temperature thresholds that trigger coral bleaching events.',
    thesis: 'Ocean heat spikes above 1°C trigger coral algae expulsion.',
    topics: ['coral bleaching', 'ocean temperature', 'symbiotic algae'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 370,
        topic: 'Bleaching trigger',
        text:
          'Sustained ocean temperature spikes above one degree Celsius above normal trigger coral polyps to expel symbiotic algae, leaving colonies visibly bleached.',
        claimStatement:
          'Sustained ocean temperature spikes above 1°C above normal trigger coral polyps to expel symbiotic algae.',
        claimTopic: 'bleaching_mechanism',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_coral_02',
    voiceIndex: 2,
    title: 'Reef Ecosystem After Bleaching',
    channel: 'Coral Reef Monitoring',
    summary: 'Documents structural and biodiversity loss following mass bleaching.',
    thesis: 'Mass bleaching reduces reef structural complexity and fish habitat diversity.',
    topics: ['coral reefs', 'ecosystem diversity', 'habitat loss'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 410,
        topic: 'Post-bleaching diversity loss',
        text:
          'Coral reef ecosystems lose structural complexity and fish habitat diversity following mass bleaching events, with recovery timelines extending beyond a decade in severely affected regions.',
        claimStatement:
          'Coral reef ecosystems lose structural complexity and fish habitat diversity following mass bleaching events.',
        claimTopic: 'ecosystem_consequence',
      },
    ],
  }),
]
