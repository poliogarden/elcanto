import { AnalysisProgress } from '@/components/analysis-progress'
import { Masthead } from '@/components/masthead'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function SynthesizePage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <AnalysisProgress synthesisId={id} />
    </main>
  )
}
