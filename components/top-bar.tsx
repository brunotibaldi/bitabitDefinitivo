'use client'

import Link from 'next/link'
import { Coins, Flame, ShieldCheck, Volume2, VolumeX } from 'lucide-react'
import { setMuted, sfx, useMuted } from '@/lib/sfx'
import { cn } from '@/lib/utils'
import { AppNav } from './app-nav'
import { Logo } from './logo'
import { useStats } from './stats-provider'

export function TopBar({ isAdmin }: { isAdmin: boolean }) {
  const { streak, totalPoints, todayFeedCount, target, streakDoneToday } = useStats()
  const muted = useMuted()
  const progress = streakDoneToday ? 1 : Math.min(todayFeedCount / target, 1)

  return (
    <header className="sticky top-0 z-40 border-b-3 border-ink bg-background/95">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-3 sm:px-4">
        <Logo />
        <div className="hidden lg:block">
          <AppNav />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex size-9 items-center justify-center border-3 border-ink bg-game-blue text-ink"
              aria-label="Panel de admin"
              title="Panel de admin"
            >
              <ShieldCheck className="size-4" />
            </Link>
          )}
          <div
            className={cn(
              'flex h-9 items-center gap-1.5 border-3 border-ink px-2 font-pixel text-[10px] tabular-nums',
              streakDoneToday ? 'bg-streak text-streak-foreground' : 'bg-secondary text-foreground',
            )}
            title={streakDoneToday ? 'Racha asegurada hoy' : `Respondé la del día o ${target} del scroll para sumar racha`}
          >
            <Flame className={cn('size-4', streakDoneToday ? 'fill-current' : 'text-streak')} aria-hidden="true" />
            <span className="sr-only">Racha:</span>
            {streak}
            {!streakDoneToday && (
              <span
                className="ml-0.5 flex h-2.5 w-8 border-2 border-ink bg-ink"
                role="img"
                aria-label={`${todayFeedCount} de ${target} hoy`}
              >
                <span className="h-full bg-streak transition-all" style={{ width: `${progress * 100}%` }} />
              </span>
            )}
          </div>
          <div className="flex h-9 items-center gap-1.5 border-3 border-ink bg-primary px-2 font-pixel text-[10px] tabular-nums text-primary-foreground">
            <Coins className="size-4" aria-hidden="true" />
            <span className="sr-only">Puntos:</span>
            {totalPoints.toLocaleString('es-AR')}
          </div>
          <button
            type="button"
            onClick={() => {
              setMuted(!muted)
              if (muted) setTimeout(sfx.coin, 30)
            }}
            className="flex size-9 items-center justify-center border-3 border-ink bg-secondary text-foreground"
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
