import { redirect } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { StatsProvider } from '@/components/stats-provider'
import { TopBar } from '@/components/top-bar'
import { localDate } from '@/lib/game/dates'
import { displayStreak, getTodayStats } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser()
  if (!profile.onboarded) redirect('/onboarding')
  const today = await getTodayStats(profile.userId)

  return (
    <StatsProvider
      initial={{
        streak: displayStreak(profile),
        totalPoints: profile.totalPoints,
        todayPoints: today.points,
        todayFeedCount: today.feedCount,
        dailyDone: today.dailyDone,
        streakDoneToday: profile.lastActiveDate === localDate(),
        target: today.target,
      }}
    >
      <TopBar isAdmin={profile.role === 'admin'} />
      <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      <div className="lg:hidden">
        <AppNav />
      </div>
    </StatsProvider>
  )
}
