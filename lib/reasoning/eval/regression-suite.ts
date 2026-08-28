import { spawnSync } from 'node:child_process'
import type { RegressionCaseResult } from '@/lib/reasoning/eval/types'

type RegressionCase = {
  name: string
  files?: string[]
  testNameFilter?: string
}

/** Unit/fixture regression only — not live E2E MCP baseline. */
const UNIT_CASES: RegressionCase[] = [
  {
    name: 'MCP comparable pool',
    files: ['lib/reasoning/__tests__/mcp-comparable-pool-regression.test.ts'],
  },
  {
    name: 'MCP candidate generation',
    files: ['lib/reasoning/__tests__/mcp-candidate-regression.test.ts'],
  },
  {
    name: 'MCP evidence grounding',
    files: ['lib/reasoning/__tests__/mcp-evidence-report.test.ts'],
  },
  {
    name: 'Duplicate agreement',
    files: ['lib/reasoning/__tests__/relationship-quality-regression.test.ts'],
    testNameFilter: 'Fixture A',
  },
  {
    name: 'Genuine divide',
    files: ['lib/reasoning/__tests__/relationship-quality-regression.test.ts'],
    testNameFilter: 'Fixture B',
  },
  {
    name: 'Different dimension',
    files: ['lib/reasoning/__tests__/relationship-quality-regression.test.ts'],
    testNameFilter: 'Fixture C',
  },
  {
    name: 'Unsupported judgment',
    files: ['lib/reasoning/__tests__/relationship-quality-regression.test.ts'],
    testNameFilter: 'Fixture D',
  },
]

function runVitest(files: string[], testNameFilter?: string): { ok: boolean; notes?: string } {
  const args = ['exec', 'vitest', 'run', ...files, '--reporter=dot']
  if (testNameFilter) args.push('-t', testNameFilter)
  const result = spawnSync('pnpm', args, {
    cwd: process.cwd(),
    shell: true,
    encoding: 'utf8',
  })
  if (result.status === 0) return { ok: true }
  const tail = (result.stderr || result.stdout || '').split('\n').slice(-8).join(' ').trim()
  return { ok: false, notes: tail.slice(0, 240) || `exit ${result.status}` }
}

export function runUnitRegressionSuite(): RegressionCaseResult[] {
  return UNIT_CASES.map((c) => {
    if (!c.files?.length) {
      return { name: c.name, result: 'NOT_IMPLEMENTED' }
    }
    const { ok, notes } = runVitest(c.files, c.testNameFilter)
    return {
      name: c.name,
      result: ok ? 'PASS' : 'FAIL',
      notes: notes ?? undefined,
    }
  })
}

export function unitRegressionPassed(results: RegressionCaseResult[]): boolean {
  return results.every((r) => r.result !== 'FAIL')
}
