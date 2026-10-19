import type { Metadata } from 'next'
import { and, eq, inArray } from 'drizzle-orm'
import { FriendActions, FriendSearch, RequestActions } from '@/components/friends'
import { UserAvatar } from '@/components/user-avatar'
import { db } from '@/lib/db'
import { friendships, profiles, user } from '@/lib/db/schema'
import { displayStreak, getFriendIds } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Amigos — Bitácora' }
export const dynamic = 'force-dynamic'

const userFields = {
  id: user.id,
  name: user.name,
  username: user.username,
  avatarColor: profiles.avatarColor,
  totalPoints: profiles.totalPoints,
  currentStreak: profiles.currentStreak,
  lastActiveDate: profiles.lastActiveDate,
  streakFreezes: profiles.streakFreezes,
}

export default async function AmigosPage() {
  const { profile } = await requireUser()
  const me = profile.userId

  const incoming = await db
    .select(userFields)
    .from(friendships)
    .innerJoin(user, eq(user.id, friendships.requesterId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(and(eq(friendships.addresseeId, me), eq(friendships.status, 'pending')))

  const friendIds = await getFriendIds(me)
  const friends = friendIds.length
    ? await db
        .select(userFields)
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(inArray(user.id, friendIds))
        .orderBy(user.name)
    : []

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Amigos</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Buscá a tus compañeros por nombre de usuario. Tu usuario es{' '}
          <span className="font-mono text-foreground">@{(await requireUser()).user.username}</span>.
        </p>
      </header>

      <FriendSearch />

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="req-title">
          <h2 id="req-title" className="text-sm font-semibold">
            Solicitudes <span className="font-mono font-normal text-primary">{incoming.length}</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3">
                <UserAvatar name={u.name} color={u.avatarColor ?? 'emerald'} />
                <Identity name={u.name} username={u.username} />
                <RequestActions requesterId={u.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="friends-title">
        <h2 id="friends-title" className="text-sm font-semibold">
          Tus amigos <span className="font-mono font-normal text-muted-foreground">{friends.length}</span>
        </h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
            Todavía no agregaste a nadie.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((u) => {
              const streak = displayStreak({
                currentStreak: u.currentStreak ?? 0,
                lastActiveDate: u.lastActiveDate ?? null,
                streakFreezes: u.streakFreezes ?? 0,
              })
              return (
                <li key={u.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                  <UserAvatar name={u.name} color={u.avatarColor ?? 'emerald'} />
                  <Identity name={u.name} username={u.username} />
                  <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                    {(u.totalPoints ?? 0).toLocaleString('es-AR')} pts
                    {streak > 0 && <span className="ml-2 text-streak">{streak}d</span>}
                  </span>
                  <FriendActions otherId={u.id} name={u.name} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

function Identity({ name, username }: { name: string; username: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate font-mono text-xs text-muted-foreground">@{username}</span>
    </div>
  )
}
