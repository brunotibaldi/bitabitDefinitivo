import { Feed } from '@/components/feed'
import { getFeedPage } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const { profile } = await requireUser()
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const firstPage = await getFeedPage({ userId: profile.userId, subjectIds: profile.subjectIds, seed, page: 0 })
  return (
    <main>
      <h1 className="sr-only">Scroll de preguntas</h1>
      <Feed seed={seed} firstPage={firstPage} />
    </main>
  )
}
