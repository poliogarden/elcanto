import Link from 'next/link'

type IssueNavigationProps = {
  issue?: string
  active?: 'input' | 'youtube' | 'archive'
}

export function IssueNavigation({ issue = 'SYNTHESIS 001', active = 'youtube' }: IssueNavigationProps) {
  return (
    <div className="flex items-stretch justify-between border-b border-line text-xs">
      <div className="flex items-stretch divide-x divide-line">
        <span className="mono-label flex items-center gap-2 px-5 py-3 md:px-8">
          {issue} <span className="text-ink-soft">{'\u2193'}</span>
        </span>
        <span
          className={`mono-label hidden items-center px-5 py-3 sm:flex ${
            active === 'youtube' ? 'bg-ink text-background' : 'text-ink-soft'
          }`}
        >
          YouTube
        </span>
      </div>
      <Link
        href="/archive"
        className={`mono-label flex items-center border-l border-line px-5 py-3 md:px-8 ${
          active === 'archive' ? 'bg-ink text-background' : 'text-ink hover:opacity-60'
        }`}
      >
        Archive
      </Link>
    </div>
  )
}
