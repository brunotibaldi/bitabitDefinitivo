import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

const OWNER_USERNAME = 'admin'
const AVATAR_COLORS = ['emerald', 'sky', 'amber', 'rose', 'violet', 'teal', 'orange', 'lime']

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))

export async function getUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export const requireUser = cache(async () => {
  const session = await getSession()
  if (!session?.user) redirect('/login')
  const user = session.user as typeof session.user & { username?: string | null }

  let [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id))
  if (!profile) {
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    await db.insert(profiles).values({ userId: user.id, avatarColor: color }).onConflictDoNothing()
    ;[profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id))
  }
  if (user.username === OWNER_USERNAME && profile.role !== 'admin') {
    ;[profile] = await db.update(profiles).set({ role: 'admin' }).where(eq(profiles.userId, user.id)).returning()
  }
  return { user: { id: user.id, name: user.name, email: user.email, username: user.username ?? '' }, profile }
})

export async function requireAdmin() {
  const ctx = await requireUser()
  if (ctx.profile.role !== 'admin') redirect('/')
  return ctx
}

export async function assertAdmin() {
  const userId = await getUserId()
  const [p] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.userId, userId))
  if (p?.role !== 'admin') throw new Error('Forbidden')
  return userId
}
