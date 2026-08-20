import { describe, expect, it } from 'vitest'
import {
  createSynthesisJobRecord,
  tryClaimSynthesisJob,
  updateSynthesisJob,
} from '@/lib/synthesis/synthesis-job-repository'
import { saveSynthesisJobLocal } from '@/lib/synthesis/synthesis-job-store'

describe('synthesis job claim', () => {
  it('only claims queued jobs once', async () => {
    const job = createSynthesisJobRecord({
      synthesisId: crypto.randomUUID(),
      draft: {
        voices: [
          {
            id: 'a',
            n: 1,
            youtubeId: 'jNQXAC9IVRw',
            url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
            title: 'One',
            channel: 'Ch',
            duration: '1:00',
          },
          {
            id: 'b',
            n: 2,
            youtubeId: 'dQw4w9WgXcQ',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Two',
            channel: 'Ch',
            duration: '1:00',
          },
        ],
      },
    })

    await saveSynthesisJobLocal(job)

    const first = await tryClaimSynthesisJob(job.id)
    const second = await tryClaimSynthesisJob(job.id)

    expect(first?.status).toBe('running')
    expect(second).toBeNull()

    await updateSynthesisJob(job.id, { status: 'completed', phase: 'complete' })
    const third = await tryClaimSynthesisJob(job.id)
    expect(third).toBeNull()
  })
})
