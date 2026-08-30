import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** E1: Water filtration — relevant pair + irrelevant vinyl / marathon sources. */
export const BLIND_MIXED_WATER_FILTRATION_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_water_01',
    voiceIndex: 1,
    title: 'Municipal Reverse Osmosis',
    channel: 'Public Water Systems',
    summary: 'Covers contaminant removal rates in city-scale RO plants.',
    thesis: 'Municipal RO systems remove most dissolved contaminants.',
    topics: ['reverse osmosis', 'municipal water', 'contaminant removal'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 380,
        topic: 'Municipal RO performance',
        text:
          'Municipal reverse osmosis systems remove more than 95 percent of dissolved contaminants from drinking water supplies when membranes are maintained on recommended replacement schedules.',
        claimStatement:
          'Municipal reverse osmosis systems remove 95%+ dissolved contaminants from drinking water.',
        claimTopic: 'ro_performance',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_water_02',
    voiceIndex: 2,
    title: 'Home Under-Sink RO Filters',
    channel: 'Residential Water Quality',
    summary: 'Tests NSF-58 rated under-sink reverse osmosis units.',
    thesis: 'Home RO filters achieve similar contaminant reduction for residential use.',
    topics: ['home water filters', 'NSF-58', 'reverse osmosis'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 390,
        topic: 'Residential RO ratings',
        text:
          'Home under-sink reverse osmosis filters rated NSF-58 achieve similar contaminant reduction for residential use compared to larger municipal treatment trains when inlet pressure is adequate.',
        claimStatement:
          'Home under-sink RO filters rated NSF-58 achieve similar contaminant reduction for residential use.',
        claimTopic: 'residential_ro',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_water_03',
    voiceIndex: 3,
    title: 'Vintage Jazz Pressings',
    channel: 'Record Collector Weekly',
    summary: 'Discusses prized original vinyl labels from 1960s jazz albums.',
    thesis: 'Collectors prize original pressing labels from 1960s jazz records.',
    topics: ['vinyl records', 'jazz collecting', 'original pressings'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 300,
        topic: 'Pressing label value',
        text:
          'Vintage vinyl record collectors prize original pressing labels from 1960s jazz albums because early label variants correlate with superior mastering quality and higher resale values.',
        claimStatement:
          'Vintage vinyl record collectors prize original pressing labels from 1960s jazz albums.',
        claimTopic: 'vinyl_collecting',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_4',
    videoId: 'blind_water_04',
    voiceIndex: 4,
    title: 'Marathon Training Basics',
    channel: 'Endurance Running Coach',
    summary: 'Explains gradual mileage buildup for marathon preparation.',
    thesis: 'Marathon schedules emphasize gradual weekly mileage increases.',
    topics: ['marathon training', 'mileage buildup', 'injury prevention'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 320,
        topic: 'Gradual mileage',
        text:
          'Marathon training schedules emphasize gradual weekly mileage increases for injury prevention, typically limiting week-over-week distance growth to ten percent for recreational runners.',
        claimStatement:
          'Marathon training schedules emphasize gradual weekly mileage increases for injury prevention.',
        claimTopic: 'marathon_training',
      },
    ],
  }),
]

/** E2: Urban cycling — relevant pair + chess / coffee irrelevant sources. */
export const BLIND_MIXED_CYCLING_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_cycling_01',
    voiceIndex: 1,
    title: 'Protected Bike Lane Safety',
    channel: 'Urban Mobility Safety',
    summary: 'Compares cyclist injury rates across lane design types.',
    thesis: 'Protected bike lanes reduce cyclist injury rates substantially.',
    topics: ['bike lanes', 'cyclist safety', 'urban infrastructure'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 370,
        topic: 'Injury rate comparison',
        text:
          'Protected bike lanes reduce cyclist injury rates by up to 44 percent compared to unprotected painted lanes on comparable urban arterials with similar traffic volumes.',
        claimStatement:
          'Protected bike lanes reduce cyclist injury rates by up to 44% compared to unprotected painted lanes.',
        claimTopic: 'lane_safety',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_cycling_02',
    voiceIndex: 2,
    title: 'Cycle Network Commuting Rates',
    channel: 'City Transport Statistics',
    summary: 'Links cycle network density to bicycle commuting adoption.',
    thesis: 'Cities with extensive cycle networks report higher bicycle commuting.',
    topics: ['cycle networks', 'bicycle commuting', 'urban transport'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 400,
        topic: 'Commuting adoption',
        text:
          'Cities with extensive protected cycle networks report higher per-capita bicycle commuting rates than cities that rely primarily on shared roadway markings without physical separation.',
        claimStatement:
          'Cities with extensive cycle networks report higher per-capita bicycle commuting rates.',
        claimTopic: 'commuting_rates',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_cycling_03',
    voiceIndex: 3,
    title: 'Digital Chess Broadcasts',
    channel: 'Competitive Chess Media',
    summary: 'Covers real-time analysis boards in professional chess tournaments.',
    thesis: 'Chess tournaments use digital boards with real-time broadcast analysis.',
    topics: ['chess tournaments', 'digital boards', 'broadcast analysis'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 15,
        endTime: 280,
        topic: 'Tournament technology',
        text:
          'Professional chess tournaments now use digital boards with real-time broadcast analysis so spectators can follow engine evaluations and move quality metrics during live games.',
        claimStatement:
          'Professional chess tournaments now use digital boards with real-time broadcast analysis.',
        claimTopic: 'chess_technology',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_4',
    videoId: 'blind_cycling_04',
    voiceIndex: 4,
    title: 'Ethiopian Single-Origin Coffee',
    channel: 'Specialty Roaster Journal',
    summary: 'Profiles high-altitude Ethiopian beans favored by specialty roasters.',
    thesis: 'Specialty roasters favor single-origin beans from high-altitude Ethiopia.',
    topics: ['specialty coffee', 'Ethiopian beans', 'single origin'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 290,
        topic: 'Bean sourcing preferences',
        text:
          'Specialty coffee roasters favor single-origin beans from high-altitude Ethiopian regions because slower cherry maturation produces brighter acidity and floral cup profiles.',
        claimStatement:
          'Specialty coffee roasters favor single-origin beans from high-altitude Ethiopian regions.',
        claimTopic: 'coffee_sourcing',
      },
    ],
  }),
]
