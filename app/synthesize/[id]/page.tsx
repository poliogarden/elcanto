import { AnalysisProgress } from '@/components/analysis-progress'
import { BrandFooter } from '@/components/brand/brand-footer'
import { Masthead } from '@/components/masthead'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function SynthesizePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Masthead />
      <div className="flex flex-1 flex-col items-center justify-center">
        <AnalysisProgress synthesisId={id} />
      </div>
      <BrandFooter />
    </main>
  )
}
