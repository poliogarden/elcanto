'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { HomePageShell } from '@/components/home/home-page-shell'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import { useTranslation } from '@/lib/i18n/locale-context'

function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

type NavLinkProps = {
  href: string
  label: string
  pathname: string
  onNavigate?: () => void
  className?: string
}

function NavLink({ href, label, pathname, onNavigate, className = '' }: NavLinkProps) {
  const active = isNavActive(href, pathname)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`mono-label text-[10px] transition-opacity hover:opacity-60 ${
        active
          ? 'border-b border-ink pb-0.5 text-ink'
          : 'border-b border-transparent pb-0.5 text-ink-soft'
      } ${className}`}
    >
      {label}
    </Link>
  )
}

export function Masthead() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const { t } = useTranslation()

  const nav = [
    { label: t('nav.newSynthesis'), href: '/' },
    { label: t('nav.myYouTube'), href: '/personal' },
    { label: t('nav.archive'), href: '/archive' },
    { label: t('nav.settings'), href: '/settings' },
    { label: t('nav.about'), href: '/about' },
  ] as const

  function closeMenu() {
    setOpen(false)
  }

  return (
    <header className="border-b border-line bg-background">
      <HomePageShell>
        <div className="flex items-center justify-between py-4 md:py-5">
          <BrandLockup symbolSize={34} />

          <div className="hidden items-center gap-4 lg:gap-5 md:flex">
            <nav className="flex items-center gap-5 lg:gap-6" aria-label="Primary">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
              ))}
            </nav>
            <LocaleSwitcher />
            {session ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="mono-label shrink-0 border border-line px-3 py-1.5 text-[10px] text-ink-soft transition-colors hover:bg-ink hover:text-background"
              >
                {t('nav.signOut')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signIn('google')}
                className="mono-label shrink-0 border border-line px-3 py-1.5 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
              >
                {t('nav.signIn')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LocaleSwitcher />
            <button
              type="button"
              aria-label={t('nav.menu')}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="mono-label border border-line px-3 py-2 text-[10px] text-ink"
            >
              {t('nav.menu')}
            </button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col border-t border-line pb-2 md:hidden" aria-label="Mobile">
            {nav.map((item) => {
              const active = isNavActive(item.href, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={`mono-label border-b border-line py-3.5 text-[10px] last:border-b-0 ${
                    active ? 'text-ink' : 'text-ink-soft'
                  }`}
                >
                  {item.label}
                  {active ? ' •' : ''}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => {
                closeMenu()
                if (session) void signOut()
                else void signIn('google')
              }}
              className="mono-label mt-1 border border-line px-3 py-2.5 text-left text-[10px] text-ink"
            >
              {session ? t('nav.signOut') : t('nav.signIn')}
            </button>
          </nav>
        )}
      </HomePageShell>
    </header>
  )
}
