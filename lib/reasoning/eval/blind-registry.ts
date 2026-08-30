import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SourceAnalysis } from '@/lib/types/source'
import {
  BLIND_AGREEMENT_EV_RANGE_SOURCES,
  BLIND_AGREEMENT_OCEAN_PH_SOURCES,
} from '@/lib/reasoning/eval/blind-data/agreements'
import {
  BLIND_COMPLEX_CARBON_PRICING_SOURCES,
  BLIND_COMPLEX_TELEHEALTH_SOURCES,
} from '@/lib/reasoning/eval/blind-data/complex'
import {
  BLIND_COMPLEMENTARY_CORAL_SOURCES,
  BLIND_COMPLEMENTARY_WILDFIRE_SOURCES,
} from '@/lib/reasoning/eval/blind-data/complementary'
import {
  BLIND_DIVIDE_FASTING_WEIGHT_SOURCES,
  BLIND_DIVIDE_SCREEN_SLEEP_SOURCES,
} from '@/lib/reasoning/eval/blind-data/divides'
import {
  BLIND_MIXED_CYCLING_SOURCES,
  BLIND_MIXED_WATER_FILTRATION_SOURCES,
} from '@/lib/reasoning/eval/blind-data/mixed-irrelevant'
import {
  BLIND_SAME_TOPIC_QUANTUM_SOURCES,
  BLIND_SAME_TOPIC_SOLAR_SOURCES,
} from '@/lib/reasoning/eval/blind-data/same-topic'

export const BLIND_FIXTURE_ORDER = [
  'blind-agreement-ocean-ph',
  'blind-agreement-ev-range',
  'blind-divide-screen-sleep',
  'blind-divide-fasting-weight',
  'blind-same-topic-solar',
  'blind-same-topic-quantum',
  'blind-complementary-wildfire',
  'blind-complementary-coral',
  'blind-mixed-water-filtration',
  'blind-mixed-cycling',
  'blind-complex-telehealth',
  'blind-complex-carbon-pricing',
] as const

export type BlindFixtureId = (typeof BLIND_FIXTURE_ORDER)[number]

export type BlindFixtureMeta = {
  id: BlindFixtureId
  question: string
  category: string
  outputLanguage?: 'ko' | 'en'
}

const BLIND_SOURCES: Record<BlindFixtureId, SourceAnalysis[]> = {
  'blind-agreement-ocean-ph': BLIND_AGREEMENT_OCEAN_PH_SOURCES,
  'blind-agreement-ev-range': BLIND_AGREEMENT_EV_RANGE_SOURCES,
  'blind-divide-screen-sleep': BLIND_DIVIDE_SCREEN_SLEEP_SOURCES,
  'blind-divide-fasting-weight': BLIND_DIVIDE_FASTING_WEIGHT_SOURCES,
  'blind-same-topic-solar': BLIND_SAME_TOPIC_SOLAR_SOURCES,
  'blind-same-topic-quantum': BLIND_SAME_TOPIC_QUANTUM_SOURCES,
  'blind-complementary-wildfire': BLIND_COMPLEMENTARY_WILDFIRE_SOURCES,
  'blind-complementary-coral': BLIND_COMPLEMENTARY_CORAL_SOURCES,
  'blind-mixed-water-filtration': BLIND_MIXED_WATER_FILTRATION_SOURCES,
  'blind-mixed-cycling': BLIND_MIXED_CYCLING_SOURCES,
  'blind-complex-telehealth': BLIND_COMPLEX_TELEHEALTH_SOURCES,
  'blind-complex-carbon-pricing': BLIND_COMPLEX_CARBON_PRICING_SOURCES,
}

export function loadBlindFixtureMeta(fixtureId: string): BlindFixtureMeta {
  const full = join(process.cwd(), 'tests/reasoning/blind/fixtures', `${fixtureId}.json`)
  return JSON.parse(readFileSync(full, 'utf8')) as BlindFixtureMeta
}

export function loadBlindFixtureSources(fixtureId: BlindFixtureId): SourceAnalysis[] {
  return BLIND_SOURCES[fixtureId]
}

export function isBlindFixtureId(id: string): id is BlindFixtureId {
  return (BLIND_FIXTURE_ORDER as readonly string[]).includes(id)
}
