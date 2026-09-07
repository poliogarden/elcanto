import { describe, expect, it } from 'vitest'
import { seedDemoCreatorChannel } from '@/lib/creator/sample/demo-channel'
import { DEMO_CHANNEL_ID } from '@/lib/creator/config'
import { loadBrain, loadChannel } from '@/lib/creator/storage/local-store'

describe('demo-channel seed', () => {
  it('seeds sample channel brain with opportunities', async () => {
    await seedDemoCreatorChannel()
    const channel = await loadChannel(DEMO_CHANNEL_ID)
    const brain = await loadBrain(DEMO_CHANNEL_ID)

    expect(channel?.isSample).toBe(true)
    expect(channel?.title).toBe('Tech Macro Daily')
    expect(brain?.opportunities.length).toBeGreaterThan(0)
    expect(brain?.positions.length).toBeGreaterThanOrEqual(2)
  })
})
