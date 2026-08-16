'use client'

import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

const nav = [
  { label: 'New Synthesis', href: '/' },
  { label: 'Archive', href: '/archive' },
  { label: 'About', href: '/about' },
]

export function Masthead() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <header className="border-b border-line bg-background">
      <div className="flex items-end justify-between px-5 py-6 md:px-8 md:py-8">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
            elcanto<span className="text-ink-soft">.</span>
          </span>
          <span className="mono-label mt-2 text-[10px] text-ink-soft md:text-[11px]">
            Many voices. One understanding.
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="mono-label text-xs text-ink transition-opacity hover:opacity-60"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="mono-label border border-line px-3 py-2 text-[10px] text-ink-soft transition-colors hover:bg-ink hover:text-background"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signIn('google')}
              className="mono-label border border-line px-3 py-2 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
            >
              Sign in
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-11 flex-col items-center justify-center gap-[5px] border border-line md:hidden"
        >
          <span className="h-[2px] w-5 bg-ink" />
          <span className="h-[2px] w-5 bg-ink" />
          <span className="h-[2px] w-5 bg-ink" />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-line md:hidden">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="mono-label border-b border-line px-5 py-4 text-xs text-ink last:border-b-0"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              if (session) void signOut()
              else void signIn('google')
            }}
            className="mono-label px-5 py-4 text-left text-xs text-ink"
          >
            {session ? 'Sign out' : 'Sign in with Google'}
          </button>
        </nav>
      )}
    </header>
  )
}
