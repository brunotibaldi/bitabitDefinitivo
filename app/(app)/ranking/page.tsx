import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { ArcadeBoard } from '@/components/ranking/arcade-board'
import { getLeaderboard } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Ranking — Bit a Bit' }
export const dynamic = 'force-dynamic'

type Scope = 'friends' | 'global'
type Period = 'week' | 'all'

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; period?: string }>
}) {
  const sp = await searchParams
  const scope: Scope = sp.scope === 'global' ? 'global' : 'friends'
  const period: Period = sp.period === 'all' ? 'all' : 'week'
  const { profile } = await requireUser()
  const rows = await getLeaderboard({ scope, period, userId: profile.userId })
  const href = (s: Scope, p: Period) => `/ranking?scope=${s}&period=${p}`

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-pixel text-lg leading-relaxed text-primary text-shadow-pixel">RANKING</h1>
          <Link href="/top" className="pixel-btn bg-game-yellow px-3 py-2 font-pixel text-[9px] text-ink">
            {'★ TOP PREGUNTAS'}
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Alcance"
            items={[
              { label: 'AMIGOS', href: href('friends', period), active: scope === 'friends' },
              { label: 'GLOBAL', href: href('global', period), active: scope === 'global' },
            ]}
          />
          <Segmented
            label="Período"
            items={[
              { label: 'SEMANA', href: href(scope, 'week'), active: period === 'week' },
              { label: 'HISTÓRICO', href: href(scope, 'all'), active: period === 'all' },
            ]}
          />
        </div>
      </header>

      {scope === 'friends' && rows.length <= 1 && (
        <div className="flex flex-col items-start gap-3 border-3 border-dashed border-foreground/25 p-4">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Todavía estás solo en este ranking. Sumá compañeros de cursada para competir.
          </p>
          <Link
            href="/amigos"
            className="pixel-btn flex items-center gap-2 bg-game-green px-3 py-2 font-pixel text-[9px] text-ink"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            AGREGAR AMIGOS
          </Link>
        </div>
      )}

      <ArcadeBoard
        key={`${scope}-${period}`}
        meId={profile.userId}
        rows={rows.map((r) => ({
          userId: r.userId,
          name: r.name,
          username: r.username,
          points: r.points,
          streak: r.streak,
        }))}
      />
    </main>
  )
}

function Segmented({ label, items }: { label: string; items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex border-3 border-ink bg-ink">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          aria-current={it.active ? 'page' : undefined}
          className={cn(
            'px-3 py-2 font-pixel text-[9px] text-muted-foreground transition-colors hover:text-foreground',
            it.active && 'bg-primary text-primary-foreground hover:text-primary-foreground',
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
