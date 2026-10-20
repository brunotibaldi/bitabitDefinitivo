import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, UserPlus } from 'lucide-react'
import { UserAvatar } from '@/components/user-avatar'
import { buttonVariants } from '@/components/ui/button'
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
              { label: 'Amigos', href: href('friends', period), active: scope === 'friends' },
              { label: 'Global', href: href('global', period), active: scope === 'global' },
            ]}
          />
          <Segmented
            label="Período"
            items={[
              { label: 'Semana', href: href(scope, 'week'), active: period === 'week' },
              { label: 'Histórico', href: href(scope, 'all'), active: period === 'all' },
            ]}
          />
        </div>
      </header>

      {scope === 'friends' && rows.length <= 1 && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-5">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            Todavía estás solo en este ranking. Sumá compañeros de cursada para competir.
          </p>
          <Link href="/amigos" className={cn(buttonVariants({ size: 'sm' }), 'rounded-lg')}>
            <UserPlus className="size-4" aria-hidden="true" />
            Agregar amigos
          </Link>
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const me = r.userId === profile.userId
          return (
            <li
              key={r.userId}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-card px-4 py-3',
                me && 'border-primary/50 bg-primary/10',
              )}
            >
              <span
                className={cn(
                  'w-7 shrink-0 text-center font-mono text-sm font-semibold text-muted-foreground',
                  i === 0 && 'text-streak',
                  i < 3 && 'text-base',
                )}
              >
                {i + 1}
              </span>
              <UserAvatar name={r.name} color={r.avatarColor} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {r.name}
                  {me && <span className="ml-2 text-xs font-normal text-primary">vos</span>}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">@{r.username}</span>
              </div>
              {r.streak > 0 && (
                <span className="flex items-center gap-1 font-mono text-xs text-streak" title={`Racha de ${r.streak} días`}>
                  <Flame className="size-3.5" aria-hidden="true" />
                  {r.streak}
                  <span className="sr-only">días de racha</span>
                </span>
              )}
              <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold">
                {r.points.toLocaleString('es-AR')}
                <span className="sr-only"> puntos</span>
              </span>
            </li>
          )
        })}
      </ol>
    </main>
  )
}

function Segmented({ label, items }: { label: string; items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex rounded-xl border bg-card p-1">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          aria-current={it.active ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
            it.active && 'bg-secondary text-foreground',
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
