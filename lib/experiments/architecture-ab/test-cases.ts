import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { loadBaselineFixture, loadFixtureSources } from '@/lib/reasoning/eval/fixtures'
import type { FrozenExperimentInput, AbSetType } from '@/lib/experiments/architecture-ab/types'

const FIXTURE_MAP: Array<{
  caseId: string
  setType: AbSetType
  label: string
  fixtureId: string
}> = [
  { caseId: 'case-01-agreement', setType: 'agreement', label: 'SET 1 Agreement', fixtureId: 'clear-agreement' },
  { caseId: 'case-02-divide', setType: 'divide', label: 'SET 2 Divide', fixtureId: 'clear-divide' },
  {
    caseId: 'case-03-complementary',
    setType: 'complementary',
    label: 'SET 3 Complementary',
    fixtureId: 'complementary-wildfire',
  },
  { caseId: 'case-04-mixed', setType: 'mixed', label: 'SET 4 Mixed', fixtureId: 'mixed-irrelevant' },
  {
    caseId: 'case-05-complex',
    setType: 'complex',
    label: 'SET 5 Complex',
    fixtureId: 'same-topic-different-claims',
  },
  {
    caseId: 'case-06-mismatch',
    setType: 'mismatch',
    label: 'SET 6 Question Mismatch',
    fixtureId: 'question-mismatch',
  },
]

export function loadAbTestCases(): FrozenExperimentInput[] {
  const frozenAt = new Date().toISOString()
  return FIXTURE_MAP.map((row) => {
    const fixture = loadBaselineFixture(row.fixtureId)
    const sources = loadFixtureSources(fixture)
    return {
      caseId: row.caseId,
      setType: row.setType,
      label: row.label,
      centralQuestion: fixture.question,
      outputLanguage: fixture.outputLanguage ?? 'en',
      sources,
      frozenAt,
      fixtureId: row.fixtureId,
      isRealYouTube: Boolean(fixture.synthesisJobId),
    }
  })
}

export async function persistFrozenInput(input: FrozenExperimentInput): Promise<string> {
  const dir = path.join(process.cwd(), 'reports', 'architecture-ab')
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${input.caseId}-frozen-input.json`)
  await writeFile(file, JSON.stringify(input, null, 2), 'utf8')
  return file
}
