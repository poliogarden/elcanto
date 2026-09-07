import { CreatorWorkspace } from '@/components/creator/creator-workspace'

type Props = { params: Promise<{ id: string }> }

export default async function CreatorProjectPage({ params }: Props) {
  const { id } = await params
  return <CreatorWorkspace projectId={id} />
}
