import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(root, '..')

function loadEnvFile(filename) {
  const filePath = path.join(projectRoot, filename)
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error('BLIND TEST ABORTED')
  console.error('Reason: OPENAI_API_KEY is not configured.')
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('pnpm', [
  'exec',
  'vitest',
  'run',
  'lib/reasoning/eval/blind-test.runner.test.ts',
  '--reporter=verbose',
])
