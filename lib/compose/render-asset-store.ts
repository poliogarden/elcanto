import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const JOBS_DIR = path.join(process.cwd(), '.data', 'render-jobs')

export async function saveRenderAsset(
  jobId: string,
  filename: string,
  body: Buffer,
): Promise<string> {
  const dir = path.join(JOBS_DIR, jobId, 'assets')
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, filename)
  await writeFile(file, body)
  return file
}

export function getRenderAssetPath(jobId: string, filename: string): string {
  return path.join(JOBS_DIR, jobId, 'assets', filename)
}

export function getRenderOutputPath(jobId: string, filename: string): string {
  return path.join(JOBS_DIR, jobId, 'out', filename)
}
