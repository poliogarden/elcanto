import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Load env files the same way as worker/render-server.mjs and local Next.js dev.
 * Does not override variables already set in process.env.
 */
export function loadProjectEnv(): void {
  loadEnvFile('.env.local')
  loadEnvFile('.env')
}

function loadEnvFile(filename: string): void {
  const filePath = join(process.cwd(), filename)
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

export class EvaluationAbortedError extends Error {
  readonly reason: string

  constructor(reason: string) {
    super(reason)
    this.name = 'EvaluationAbortedError'
    this.reason = reason
  }
}

export function assertLiveEvalEnvironment(): void {
  loadProjectEnv()
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    const reason = 'OPENAI_API_KEY is not configured.'
    console.error('EVALUATION ABORTED')
    console.error(`Reason: ${reason}`)
    throw new EvaluationAbortedError(reason)
  }
}

export function isLiveEvalEnvironmentReady(): boolean {
  loadProjectEnv()
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}
