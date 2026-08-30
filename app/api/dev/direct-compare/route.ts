import { NextResponse } from 'next/server'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'
import { isDirectSynthesisExperimentAllowed } from '@/lib/production/dev-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isDirectSynthesisExperimentAllowed()) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 })
  }
  return NextResponse.json({ cases: FINAL_DECISION_CASES })
}
