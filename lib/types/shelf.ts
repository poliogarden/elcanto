import type { LibraryItem } from '@/lib/types/library'

export type Shelf = {
  id: string
  userId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ShelfWithPreview = Shelf & {
  videoCount: number
  previewThumbnails: string[]
}

export type ShelfDetail = Shelf & {
  items: LibraryItem[]
}
