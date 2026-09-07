import { describe, expect, it } from 'vitest'
import { artifactsInvalidatedBy, markProjectInvalidation } from '@/lib/creator/invalidation-graph'
import type { VideoProject } from '@/lib/creator/types'

const baseProject = (): VideoProject => ({
  id: 'p1',
  channelId: 'c1',
  userId: 'u1',
  topic: 'Test',
  objective: null,
  stage: 'script',
  status: 'draft',
  format: '16:9',
  research: null,
  angle: null,
  outline: null,
  script: null,
  scenes: [],
  visualAssets: [],
  renderJobs: [],
  renderVersions: [],
  linkedVideos: [],
  linkedPositionIds: [],
  decisions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('invalidation-graph', () => {
  it('script change invalidates render chain', () => {
    const downstream = artifactsInvalidatedBy('script')
    expect(downstream).toContain('scenes')
    expect(downstream).toContain('render')
  })

  it('thumbnail change does not invalidate render', () => {
    expect(artifactsInvalidatedBy('thumbnail')).toEqual([])
  })

  it('marks downstream artifacts dirty', () => {
    const inv = markProjectInvalidation(baseProject(), 'script')
    expect(inv.render).toBe(true)
    expect(inv.timeline).toBe(true)
  })
})
