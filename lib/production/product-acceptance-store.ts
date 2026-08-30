import { mkdir, readFile, readdir, writeFile, rename } from 'fs/promises'
import path from 'path'
import type {
  AcceptanceFailureCategory,
  ProductAcceptanceRecord,
} from '@/lib/production/types'

const ACCEPTANCE_DIR = path.join(process.cwd(), '.data', 'product-acceptance')

async function ensureDir(): Promise<void> {
  await mkdir(ACCEPTANCE_DIR, { recursive: true })
}

function recordPath(synthesisId: string): string {
  return path.join(ACCEPTANCE_DIR, `${synthesisId}.json`)
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  await writeFile(tmpPath, contents, 'utf8')
  await rename(tmpPath, filePath)
}

export async function loadProductAcceptance(
  synthesisId: string,
): Promise<ProductAcceptanceRecord | null> {
  try {
    const raw = await readFile(recordPath(synthesisId), 'utf8')
    return JSON.parse(raw) as ProductAcceptanceRecord
  } catch {
    return null
  }
}

export async function saveProductAcceptance(
  record: ProductAcceptanceRecord,
): Promise<ProductAcceptanceRecord> {
  await ensureDir()
  const now = new Date().toISOString()
  const existing = await loadProductAcceptance(record.synthesisId)
  const next: ProductAcceptanceRecord = {
    ...existing,
    ...record,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await atomicWrite(recordPath(record.synthesisId), JSON.stringify(next, null, 2))
  return next
}

export async function listProductAcceptanceRecords(): Promise<ProductAcceptanceRecord[]> {
  try {
    await ensureDir()
    const files = await readdir(ACCEPTANCE_DIR)
    const records: ProductAcceptanceRecord[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await readFile(path.join(ACCEPTANCE_DIR, file), 'utf8')
        records.push(JSON.parse(raw) as ProductAcceptanceRecord)
      } catch {
        // skip corrupt files
      }
    }
    return records.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  } catch {
    return []
  }
}

export type AcceptanceBacklogSummary = {
  totalRated: number
  byCategory: Record<AcceptanceFailureCategory, number>
  missedRelationshipCount: number
  falseRelationshipCount: number
  wouldReuseGood: number
  wouldReusePartial: number
  wouldReuseBad: number
}

export function summarizeAcceptanceBacklog(
  records: ProductAcceptanceRecord[],
): AcceptanceBacklogSummary {
  const categories: AcceptanceFailureCategory[] = [
    'INGEST_FAILURE',
    'TRANSCRIPT_FAILURE',
    'EXTRACTION_FAILURE',
    'EVIDENCE_FAILURE',
    'RELEVANCE_FAILURE',
    'RELATIONSHIP_MISS',
    'FALSE_RELATIONSHIP',
    'JUDGMENT_FAILURE',
    'UX_COMPREHENSION_FAILURE',
    'PERFORMANCE_FAILURE',
    'NONE',
  ]
  const byCategory = Object.fromEntries(categories.map((c) => [c, 0])) as Record<
    AcceptanceFailureCategory,
    number
  >

  let missedRelationshipCount = 0
  let falseRelationshipCount = 0
  let wouldReuseGood = 0
  let wouldReusePartial = 0
  let wouldReuseBad = 0

  for (const r of records) {
    if (r.missedRelationship) missedRelationshipCount += 1
    if (r.falseRelationship) falseRelationshipCount += 1
    if (r.wouldReuse === 'good') wouldReuseGood += 1
    if (r.wouldReuse === 'partial') wouldReusePartial += 1
    if (r.wouldReuse === 'bad') wouldReuseBad += 1
    for (const cat of r.failureCategories ?? []) {
      byCategory[cat] = (byCategory[cat] ?? 0) + 1
    }
  }

  return {
    totalRated: records.length,
    byCategory,
    missedRelationshipCount,
    falseRelationshipCount,
    wouldReuseGood,
    wouldReusePartial,
    wouldReuseBad,
  }
}
