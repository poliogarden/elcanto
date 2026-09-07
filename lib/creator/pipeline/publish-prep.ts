import { z } from 'zod'
import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import type { VideoProject } from '@/lib/creator/types'

const PublishPrepSchema = z.object({
  titles: z.array(z.string()).min(3).max(5),
  description: z.string(),
  thumbnailConcepts: z.array(
    z.object({
      headline: z.string(),
      visual: z.string(),
      mood: z.string(),
    }),
  ),
  tags: z.array(z.string()).default([]),
})

export async function generatePublishPrep(project: VideoProject): Promise<{
  titles: string[]
  description: string
  thumbnailConcepts: Array<{ headline: string; visual: string; mood: string }>
  tags: string[]
}> {
  const openai = getOpenAIClient()
  const script = project.script as { hook?: string; conclusion?: string } | null
  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: 'Generate YouTube publish metadata for a creator video.',
    user: `Topic: ${project.topic}\nObjective: ${project.objective ?? ''}\nHook: ${script?.hook ?? ''}\nConclusion: ${script?.conclusion ?? ''}`,
    schema: PublishPrepSchema,
    schemaName: 'creator_publish_prep',
    maxOutputTokens: 2000,
  })
}
