import { DirectCompareView } from '@/components/dev/direct-compare-view'
import { findFinalDecisionCase } from '@/lib/direct-synthesis/cases'
import { isDirectSynthesisExperimentAllowed } from '@/lib/production/dev-access'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ caseId: string }> }

export default async function DirectCompareCasePage({ params }: PageProps) {
  if (!isDirectSynthesisExperimentAllowed()) {
    notFound()
  }

  const { caseId } = await params
  const caseDef = findFinalDecisionCase(caseId)
  if (!caseDef) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="mb-6 text-sm">
        <Link href="/dev/direct-compare" className="underline text-ink-soft">All cases</Link>
      </p>
      <DirectCompareView caseId={caseDef.slug} />
    </main>
  )
}
