'use client'

import Link from 'next/link'
import { Flame, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppNav } from './app-nav'
import { useStats } from './stats-provider'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
        {'>_'}
      </span>
      bitácora
    </Link>
  )
}

export function TopBar() {
  const { streak, totalPoints, todayFeedCount, target, streakDoneToday } = useStats()
  const progress = streakDoneToday ? 1 : Math.min(todayFeedCount / target, 1)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="hidden md:block">
          <AppNav />
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums',
              streakDoneToday ? 'border-streak/40 bg-streak/10 text-streak' : 'text-muted-foreground',
            )}
            title={streakDoneToday ? 'Racha asegurada hoy' : `Respondé la del día o ${target} del scroll para sumar racha`}
          >
            <Flame className={cn('size-4', streakDoneToday && 'fill-streak')} aria-hidden="true" />
            <span className="sr-only">Racha:</span>
            {streak}
            {!streakDoneToday && (
              <span className="relative ml-1 h-1.5 w-8 overflow-hidden rounded-full bg-muted" aria-label={`${todayFeedCount} de ${target} hoy`}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-streak transition-all" style={{ width: `${progress * 100}%` }} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <span className="sr-only">Puntos:</span>
            {totalPoints.toLocaleString('es-AR')}
          </div>
        </div>
      </div>
    </header>
  )
}
