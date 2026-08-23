type Props = {
  count?: number
}

const GRID_CLASS =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

export function VideoGridSkeleton({ count = 10 }: Props) {
  return (
    <div className={GRID_CLASS} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video w-full rounded-lg bg-paper-2" />
          <div className="mt-2.5 h-4 w-full rounded bg-paper-2" />
          <div className="mt-1.5 h-3 w-2/3 rounded bg-paper-2" />
        </div>
      ))}
    </div>
  )
}

export { GRID_CLASS as VIDEO_GRID_CLASS }
