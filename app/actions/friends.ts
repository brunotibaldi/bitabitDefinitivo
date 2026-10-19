'use server'

import { and, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { friendships, profiles, user } from '@/lib/db/schema'
import { getUserId } from '@/lib/session'

export type UserSearchResult = {
  id: string
  username: string
  name: string
  avatarColor: string
  relation: 'none' | 'friends' | 'sent' | 'received'
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const me = await getUserId()
  const q = query.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
  if (q.length < 2) return []
  const rows = await db
    .select({ id: user.id, username: user.username, name: user.name, avatarColor: profiles.avatarColor })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(and(ne(user.id, me), ilike(user.username, `${q}%`)))
    .limit(10)
  if (!rows.length) return []

  const rels = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)))

  return rows.map((r) => {
    const rel = rels.find(
      (f) => (f.requesterId === me && f.addresseeId === r.id) || (f.addresseeId === me && f.requesterId === r.id),
    )
    const relation: UserSearchResult['relation'] = !rel
      ? 'none'
      : rel.status === 'accepted'
        ? 'friends'
        : rel.requesterId === me
          ? 'sent'
          : 'received'
    return { id: r.id, username: r.username ?? '', name: r.name, avatarColor: r.avatarColor ?? 'emerald', relation }
  })
}

export async function sendFriendRequest(targetId: string) {
  const me = await getUserId()
  if (targetId === me) return { ok: false }
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId))
  if (!target) return { ok: false }

  const [reverse] = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, me)))
  if (reverse) {
    await db.update(friendships).set({ status: 'accepted' }).where(eq(friendships.id, reverse.id))
  } else {
    await db.insert(friendships).values({ requesterId: me, addresseeId: targetId }).onConflictDoNothing()
  }
  revalidatePath('/amigos')
  return { ok: true }
}

export async function respondFriendRequest(requesterId: string, accept: boolean) {
  const me = await getUserId()
  const where = and(
    eq(friendships.requesterId, requesterId),
    eq(friendships.addresseeId, me),
    eq(friendships.status, 'pending'),
  )
  if (accept) await db.update(friendships).set({ status: 'accepted' }).where(where)
  else await db.delete(friendships).where(where)
  revalidatePath('/amigos')
  revalidatePath('/ranking')
}

export async function removeFriend(otherId: string) {
  const me = await getUserId()
  await db
    .delete(friendships)
    .where(
      sql`(${friendships.requesterId} = ${me} and ${friendships.addresseeId} = ${otherId}) or (${friendships.requesterId} = ${otherId} and ${friendships.addresseeId} = ${me})`,
    )
  revalidatePath('/amigos')
  revalidatePath('/ranking')
}
