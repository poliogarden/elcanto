import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** Attic insulation R-value — mix of relevant and keyword-overlap irrelevant sources. */
export const MIXED_IRRELEVANT_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'bench_attic_01',
    voiceIndex: 1,
    title: 'Cold Climate Retrofit Guide',
    channel: 'Home Efficiency Lab',
    summary: 'Recommendations for attic insulation in northern retrofits.',
    thesis: 'Cold-climate attic retrofits should target high R-values.',
    topics: ['attic insulation', 'R-value', 'cold climate retrofit'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 420,
        topic: 'Code recommendations',
        text:
          'Building codes in cold climates recommend attic insulation with an R-value of at least R-49 for retrofit projects so that heated air rising into the attic is blocked before it escapes through the roof assembly.',
        claimStatement:
          'Building codes in cold climates recommend attic insulation with an R-value of at least R-49 for retrofit projects.',
        claimTopic: 'insulation_r_value',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'bench_attic_02',
    voiceIndex: 2,
    title: 'Northern Attic Upgrades',
    channel: 'Retrofit Pro',
    summary: 'Practical R-value targets for attic retrofits in cold regions.',
    thesis: 'Northern attic retrofits commonly use R-49 to R-60 insulation.',
    topics: ['attic retrofit', 'insulation', 'R-value'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 390,
        topic: 'Target R-values',
        text:
          'Attic retrofits in northern regions typically target R-49 to R-60 insulation levels to minimize heat loss through the roof deck during long heating seasons.',
        claimStatement:
          'Attic retrofits in northern regions typically target R-49 to R-60 insulation levels to minimize heat loss.',
        claimTopic: 'insulation_r_value',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'bench_attic_03',
    voiceIndex: 3,
    title: 'Car Sound Dampening Tips',
    channel: 'Auto Comfort',
    summary: 'Automotive insulation products for cabin noise reduction.',
    thesis: 'Automotive insulation addresses noise, not attic thermal performance.',
    topics: ['automotive', 'sound insulation', 'cabin noise'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 280,
        topic: 'Cabin insulation',
        text:
          'Automotive sound insulation mats use dense foam layers to reduce road noise inside the cabin. These mats are installed under carpets and door panels to dampen vibration from tires and engines.',
        claimStatement:
          'Automotive sound insulation mats use dense foam layers to reduce road noise inside the cabin.',
        claimTopic: 'automotive_insulation',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_4',
    videoId: 'bench_attic_04',
    voiceIndex: 4,
    title: 'Attic Holiday Storage Ideas',
    channel: 'Home Organize',
    summary: 'Organizing seasonal items stored in residential attics.',
    thesis: 'Attic storage solutions focus on organization, not insulation performance.',
    topics: ['attic storage', 'home organization', 'seasonal decor'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 260,
        topic: 'Storage organizers',
        text:
          'Holiday attic storage organizers help families arrange seasonal decorations without blocking ventilation paths, using labeled bins and ceiling-mounted racks to keep floor decking clear.',
        claimStatement:
          'Holiday attic storage organizers help families arrange seasonal decorations without blocking ventilation paths.',
        claimTopic: 'attic_storage',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_5',
    videoId: 'bench_attic_05',
    voiceIndex: 5,
    title: 'Mountain Valley Weather',
    channel: 'Regional Forecast',
    summary: 'Weekly weather patterns in cold-climate mountain valleys.',
    thesis: 'Cold-climate weather forecasts describe temperature swings, not retrofit specs.',
    topics: ['weather forecast', 'cold climate', 'mountain valleys'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 10,
        endTime: 240,
        topic: 'Weekly forecasts',
        text:
          'Regional weather forecasts for cold climates predict weekly temperature swings across mountain valleys, with overnight lows dropping below freezing while afternoon sun warms exposed slopes.',
        claimStatement:
          'Regional weather forecasts for cold climates predict weekly temperature swings across mountain valleys.',
        claimTopic: 'weather_forecast',
      },
    ],
  }),
]
