'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Gamepad2, Plus, Star, Trophy, User } from 'lucide-react'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'
import { useStats } from './stats-provider'

const ITEMS = [
  { href: '/', label: 'Jugar', icon: Gamepad2, color: 'bg-primary', desk: 'lg:bg-primary', center: true, order: 'order-3 lg:order-1', hideMobile: false },
  { href: '/hoy', label: 'Del día', icon: CalendarDays, color: 'bg-game-red', desk: 'lg:bg-game-red', center: false, order: 'order-1 lg:order-2', hideMobile: false },
  { href: '/ranking', label: 'Ranking', icon: Trophy, color: 'bg-game-green', desk: 'lg:bg-game-green', center: false, order: 'order-2 lg:order-3', hideMobile: false },
  { href: '/top', label: 'Top', icon: Star, color: 'bg-game-yellow', desk: 'lg:bg-game-yellow', center: false, order: 'order-4 lg:order-4', hideMobile: false },
  { href: '/crear', label: 'Crear', icon: Plus, color: 'bg-game-blue', desk: 'lg:bg-game-blue', center: false, order: 'lg:order-5', hideMobile: true },
  { href: '/perfil', label: 'Perfil', icon: User, color: 'bg-game-blue', desk: 'lg:bg-game-blue', center: false, order: 'order-5 lg:order-6', hideMobile: false },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/ranking') return pathname.startsWith('/ranking') || pathname.startsWith('/amigos')
  return pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()
  const { dailyDone } = useStats()
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-3 border-ink bg-background pb-[env(safe-area-inset-bottom)] lg:static lg:border-t-0 lg:bg-transparent lg:pb-0"
    >
      <ul className="mx-auto flex max-w-md items-end justify-between px-2 lg:max-w-none lg:items-center lg:gap-1.5 lg:px-0">
        {ITEMS.map(({ href, label, icon: Icon, color, desk, center, order, hideMobile }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href} className={cn('flex-1 justify-center lg:flex lg:flex-none', order, hideMobile ? 'hidden' : 'flex')}>
              <Link
                href={href}
                onClick={() => sfx.tap()}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground lg:flex-row lg:gap-2 lg:border-3 lg:px-3 lg:py-1.5 lg:text-xs',
                  active ? 'text-foreground lg:border-ink lg:text-ink' : 'lg:border-transparent',
                  active && desk,
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center border-3 transition-transform lg:border-0 lg:bg-transparent',
                    center ? '-mt-6 size-14 border-ink bg-primary text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] lg:mt-0 lg:size-auto lg:shadow-none lg:text-inherit' : 'size-9',
                    !center && (active ? cn('border-ink text-ink', color) : 'border-transparent'),
                    active && 'scale-105',
                  )}
                >
                  <Icon className={cn(center ? 'size-7 lg:size-4' : 'size-5 lg:size-4')} strokeWidth={center ? 3 : 2} aria-hidden="true" />
                </span>
                {label}
                {href === '/hoy' && !dailyDone && (
                  <span className="absolute top-1.5 right-1 size-2.5 animate-blink border-2 border-ink bg-streak lg:static lg:size-2" aria-label="pendiente" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
