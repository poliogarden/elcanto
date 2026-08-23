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
  product?: boolean
}

function NavLink({ href, label, pathname, onNavigate, className = '', product }: NavLinkProps) {
  const active = isNavActive(href, pathname)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={
        product
          ? `text-sm font-medium transition-colors hover:text-ink ${
              active ? 'text-ink' : 'text-ink-soft'
            } ${className}`
          : `text-xs font-medium uppercase tracking-wide transition-opacity hover:opacity-60 ${
              active
                ? 'border-b border-ink pb-0.5 text-ink'
                : 'border-b border-transparent pb-0.5 text-ink-soft'
            } ${className}`
      }
    >
      {label}
    </Link>
  )
}

type Props = {
  variant?: 'default' | 'product'
}

export function Masthead({ variant = 'default' }: Props) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const { t } = useTranslation()
  const product = variant === 'product'

  const nav = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.library'), href: '/library' },
    { label: t('nav.archive'), href: '/archive' },
  ] as const

  function closeMenu() {
    setOpen(false)
  }

  const authButtonClass = product
    ? 'shrink-0 text-sm font-medium text-ink-soft transition-colors hover:text-ink'
    : 'mono-label shrink-0 border border-line px-3 py-1.5 text-[10px] text-ink-soft transition-colors hover:bg-ink hover:text-background'

  return (
    <header className={product ? 'bg-background' : 'border-b border-line bg-background'}>
      <HomePageShell>
        <div className={`flex items-center justify-between ${product ? 'py-3' : 'py-3.5 md:py-4'}`}>
          <BrandLockup
            symbolSize={product ? 30 : 34}
            tagline={t('brand.tagline')}
            showTagline={!product}
          />

          <div className="hidden items-center gap-5 md:flex">
            <nav className="flex items-center gap-5" aria-label="Primary">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  pathname={pathname}
                  product={product}
                />
              ))}
            </nav>
            <LocaleSwitcher />
            {session ? (
              <button type="button" onClick={() => void signOut()} className={authButtonClass}>
                {t('nav.signOut')}
              </button>
            ) : (
              <button type="button" onClick={() => void signIn('google')} className={authButtonClass}>
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
              className={
                product
                  ? 'text-sm font-medium text-ink'
                  : 'mono-label border border-line px-3 py-2 text-[10px] text-ink'
              }
            >
              {t('nav.menu')}
            </button>
          </div>
        </div>

        {open && (
          <nav
            className={`flex flex-col pb-2 md:hidden ${product ? '' : 'border-t border-line'}`}
            aria-label="Mobile"
          >
            {nav.map((item) => {
              const active = isNavActive(item.href, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? 'page' : undefined}
                  className={
                    product
                      ? `py-3 text-sm ${active ? 'font-medium text-ink' : 'text-ink-soft'}`
                      : `mono-label border-b border-line py-3.5 text-[10px] last:border-b-0 ${
                          active ? 'text-ink' : 'text-ink-soft'
                        }`
                  }
                >
                  {item.label}
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
              className={
                product
                  ? 'mt-1 py-2.5 text-left text-sm text-ink'
                  : 'mono-label mt-1 border border-line px-3 py-2.5 text-left text-[10px] text-ink'
              }
            >
              {session ? t('nav.signOut') : t('nav.signIn')}
            </button>
          </nav>
        )}
      </HomePageShell>
    </header>
  )
}
