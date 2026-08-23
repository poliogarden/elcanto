import { describe, expect, it } from 'vitest'
import { chunkSectionsForCoverage } from '@/lib/pipeline/hierarchical-analyze'

describe('chunkSectionsForCoverage', () => {
  it('returns empty array for no sections', () => {
    expect(chunkSectionsForCoverage([], 4)).toEqual([])
  })

  it('chunks sections into batches', () => {
    const sections = [1, 2, 3, 4, 5, 6, 7]
    expect(chunkSectionsForCoverage(sections, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('uses minimum batch size of 1', () => {
    expect(chunkSectionsForCoverage([1, 2], 0)).toEqual([[1], [2]])
  })
})
