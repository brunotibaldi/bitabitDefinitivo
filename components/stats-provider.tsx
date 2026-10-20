'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type Stats = {
  streak: number
  totalPoints: number
  todayPoints: number
  todayFeedCount: number
  dailyDone: boolean
  streakDoneToday: boolean
  target: number
}

type Ctx = Stats & { apply: (patch: Partial<Stats> & { addPoints?: number }) => void }

const StatsContext = createContext<Ctx | null>(null)

export function StatsProvider({ initial, children }: { initial: Stats; children: React.ReactNode }) {
  const [stats, setStats] = useState(initial)
  const apply = useCallback<Ctx['apply']>(({ addPoints, ...patch }) => {
    setStats((s) => ({ ...s, ...patch, todayPoints: s.todayPoints + (addPoints ?? 0) }))
  }, [])
  const value = useMemo(() => ({ ...stats, apply }), [stats, apply])
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
}

export function useStats() {
  const ctx = useContext(StatsContext)
  if (!ctx) throw new Error('useStats must be used inside StatsProvider')
  return ctx
}
