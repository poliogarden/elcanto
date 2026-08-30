import { NextResponse } from 'next/server'
import { isDevToolsAllowed } from '@/lib/production/dev-access'
import {
  listProductAcceptanceRecords,
  loadProductAcceptance,
  saveProductAcceptance,
  summarizeAcceptanceBacklog,
} from '@/lib/production/product-acceptance-store'
import type {
  AcceptanceFailureCategory,
  AcceptanceRating,
  ProductAcceptanceRecord,
} from '@/lib/production/types'
import { listRecentSynthesisJobsLocal } from '@/lib/synthesis/synthesis-job-store'

export const dynamic = 'force-dynamic'

const RATINGS: AcceptanceRating[] = ['good', 'partial', 'bad']
const FAILURE_CATEGORIES: AcceptanceFailureCategory[] = [
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

function isRating(v: unknown): v is AcceptanceRating {
  return typeof v === 'string' && RATINGS.includes(v as AcceptanceRating)
}

function isFailureCategory(v: unknown): v is AcceptanceFailureCategory {
  return typeof v === 'string' && FAILURE_CATEGORIES.includes(v as AcceptanceFailureCategory)
}

export async function GET(request: Request) {
  if (!isDevToolsAllowed()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const synthesisId = url.searchParams.get('synthesisId')
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 30)))

  if (synthesisId) {
    const acceptance = await loadProductAcceptance(synthesisId)
    return NextResponse.json({ acceptance })
  }

  const jobs = await listRecentSynthesisJobsLocal(limit)
  const acceptanceRecords = await listProductAcceptanceRecords()
  const backlog = summarizeAcceptanceBacklog(acceptanceRecords)

  const acceptanceBySynthesisId = Object.fromEntries(
    acceptanceRecords.map((r) => [r.synthesisId, r]),
  )

  return NextResponse.json({
    jobs,
    acceptanceBySynthesisId,
    backlog,
  })
}

export async function POST(request: Request) {
  if (!isDevToolsAllowed()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 })
  }

  const body = (await request.json()) as Partial<ProductAcceptanceRecord>
  if (!body.synthesisId || typeof body.synthesisId !== 'string') {
    return NextResponse.json({ error: 'synthesisId required.' }, { status: 400 })
  }

  const requiredRatings: Array<keyof ProductAcceptanceRecord> = [
    'analysisQuality',
    'agreementQuality',
    'divideQuality',
    'complementaryQuality',
    'evidenceQuality',
    'synthesisQuality',
    'timeSaving',
    'wouldReuse',
  ]

  for (const key of requiredRatings) {
    if (!isRating(body[key])) {
      return NextResponse.json({ error: `${key} must be good|partial|bad.` }, { status: 400 })
    }
  }

  const failureCategories = Array.isArray(body.failureCategories)
    ? body.failureCategories.filter(isFailureCategory)
    : undefined

  const record = await saveProductAcceptance({
    synthesisId: body.synthesisId,
    sourceCount: Number(body.sourceCount ?? 0),
    testSetLabel: typeof body.testSetLabel === 'string' ? body.testSetLabel : undefined,
    analysisQuality: body.analysisQuality!,
    agreementQuality: body.agreementQuality!,
    divideQuality: body.divideQuality!,
    complementaryQuality: body.complementaryQuality!,
    evidenceQuality: body.evidenceQuality!,
    synthesisQuality: body.synthesisQuality!,
    missedRelationship: Boolean(body.missedRelationship),
    falseRelationship: Boolean(body.falseRelationship),
    timeSaving: body.timeSaving!,
    wouldReuse: body.wouldReuse!,
    zeroRelationshipResult: isRating(body.zeroRelationshipResult)
      ? body.zeroRelationshipResult
      : undefined,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
    failureCategories,
    engineVersion: typeof body.engineVersion === 'string' ? body.engineVersion : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return NextResponse.json({ acceptance: record })
}
