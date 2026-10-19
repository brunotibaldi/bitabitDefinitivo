'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Layers, Trophy, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStats } from './stats-provider'

const ITEMS = [
  { href: '/', label: 'Scroll', icon: Layers },
  { href: '/hoy', label: 'Del día', icon: CalendarDays },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/amigos', label: 'Amigos', icon: Users },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function AppNav() {
  const pathname = usePathname()
  const { dailyDone } = useStats()
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:static md:border-t-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 md:max-w-none md:gap-1 md:px-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground md:flex-row md:gap-2 md:rounded-full md:px-3.5 md:py-2 md:text-sm',
                  active && 'text-primary hover:text-primary md:bg-primary/10',
                )}
              >
                <Icon className="size-5 md:size-4" aria-hidden="true" />
                {label}
                {href === '/hoy' && !dailyDone && (
                  <span className="absolute top-2 right-[calc(50%-14px)] size-2 rounded-full bg-streak md:static md:size-1.5" aria-label="pendiente" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
