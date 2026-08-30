import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** A1: Ocean acidification pH decline — different phrasing, same proposition. */
export const BLIND_AGREEMENT_OCEAN_PH_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_ocean_ph_01',
    voiceIndex: 1,
    title: 'Open Ocean Carbon Chemistry',
    channel: 'Marine Science Review',
    summary: 'Reviews long-term changes in seawater chemistry from CO2 uptake.',
    thesis: 'Ocean surface pH has measurably declined due to carbon dioxide absorption.',
    topics: ['ocean acidification', 'pH', 'carbon dioxide'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 420,
        topic: 'Surface pH trends',
        text:
          'Marine researchers report that open-ocean surface pH has declined by approximately 0.1 units since pre-industrial times because seawater absorbs rising atmospheric carbon dioxide concentrations.',
        claimStatement:
          'Open-ocean surface pH has declined by approximately 0.1 units since pre-industrial times due to carbon dioxide absorption.',
        claimTopic: 'ocean_pH',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_ocean_ph_02',
    voiceIndex: 2,
    title: 'Global Seawater Measurements',
    channel: 'Ocean Monitoring Network',
    summary: 'Analyzes century-scale pH records from buoy and ship observations.',
    thesis: 'Average ocean surface pH values have dropped over the past century.',
    topics: ['seawater pH', 'ocean monitoring', 'climate chemistry'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 45,
        endTime: 400,
        topic: 'Century-scale pH drop',
        text:
          'Long-term seawater measurements show a measurable drop in average pH values across the global ocean surface layer over the past century as dissolved CO2 levels increased.',
        claimStatement:
          'Long-term seawater measurements show a measurable drop in average pH values across the global ocean surface layer over the past century.',
        claimTopic: 'ocean_pH',
      },
    ],
  }),
]

/** A2: EV driving range — imperial vs metric expression of same range band. */
export const BLIND_AGREEMENT_EV_RANGE_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_ev_range_01',
    voiceIndex: 1,
    title: 'Mass-Market EV Range Report',
    channel: 'Electric Drive Weekly',
    summary: 'Surveys EPA-rated range figures for current consumer EV models.',
    thesis: 'Mass-market EVs deliver roughly 250-300 miles per charge.',
    topics: ['electric vehicles', 'battery range', 'EPA ratings'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 360,
        topic: 'EPA range survey',
        text:
          'Current mass-market electric vehicle models typically deliver between 250 and 300 miles of EPA-rated range on a full charge when tested under standard driving cycles.',
        claimStatement:
          'Current mass-market EV models typically deliver between 250 and 300 miles of EPA-rated range on a full charge.',
        claimTopic: 'ev_range',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_ev_range_02',
    voiceIndex: 2,
    title: 'Consumer EV Market Snapshot',
    channel: 'Auto Electrification',
    summary: 'Compares driving range across popular battery-electric vehicles.',
    thesis: 'Consumer EVs achieve roughly 400-480 km before recharging.',
    topics: ['electric vehicles', 'driving range', 'consumer market'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 380,
        topic: 'Kilometer range comparison',
        text:
          'Consumer electric vehicles on sale today generally achieve roughly 400 to 480 kilometers of driving range before requiring recharging, placing them in a comparable band to leading gasoline sedans for daily commuting.',
        claimStatement:
          'Consumer electric vehicles on sale today generally achieve roughly 400 to 480 kilometers of driving range before requiring recharging.',
        claimTopic: 'ev_range',
      },
    ],
  }),
]
