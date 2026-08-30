import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BenchmarkGoldExpectations } from '@/lib/reasoning/eval/benchmark-gold'
import { BLIND_FIXTURE_ORDER, type BlindFixtureId } from '@/lib/reasoning/eval/blind-registry'

const GOLD_DIR = join(process.cwd(), 'tests/reasoning/blind/gold')

export function loadBlindGold(fixtureId: BlindFixtureId): BenchmarkGoldExpectations {
  const path = join(GOLD_DIR, `${fixtureId}.json`)
  const raw = JSON.parse(readFileSync(path, 'utf8')) as BenchmarkGoldExpectations
  return { ...raw, category: 'benchmark' }
}

export function loadAllBlindGold(): BenchmarkGoldExpectations[] {
  return BLIND_FIXTURE_ORDER.map((id) => loadBlindGold(id))
}
