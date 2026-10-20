import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminQuestionItem } from '@/components/admin-question-item'
import { getAdminCounts, getPendingQuestions, getReportedQuestions, getSubjectOptions } from '@/lib/game/admin-queries'
import { requireUser } from '@/lib/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Panel de admin — Bit a Bit' }
export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { profile } = await requireUser()
  if (profile.role !== 'admin') notFound()
  const { tab = 'reportes' } = await searchParams

  const [counts, subjects, items] = await Promise.all([
    getAdminCounts(),
    getSubjectOptions(),
    tab === 'pendientes' ? getPendingQuestions() : getReportedQuestions(),
  ])

  const tabs = [
    { id: 'reportes', label: 'REPORTES', count: counts.reported, color: 'bg-game-red' },
    { id: 'pendientes', label: 'PENDIENTES', count: counts.pending, color: 'bg-game-yellow' },
  ]

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-2">
        <span className="font-pixel text-[10px] text-game-blue">{'> SUDO MODE'}</span>
        <h1 className="font-pixel text-lg leading-relaxed text-primary text-shadow-pixel">PANEL DE ADMIN</h1>
        <p className="text-sm text-muted-foreground">{counts.total} preguntas publicadas en el juego.</p>
      </header>

      <nav className="flex gap-2" aria-label="Secciones">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              'pixel-btn flex flex-1 items-center justify-center gap-2 py-3 font-pixel text-[9px]',
              tab === t.id ? cn(t.color, 'text-ink') : 'bg-secondary',
            )}
          >
            {t.label}
            <span className="border-2 border-ink bg-ink px-1.5 py-0.5 text-foreground">{t.count}</span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="pixel-box bg-card p-8 text-center font-pixel text-[10px] leading-relaxed text-muted-foreground">
          {tab === 'pendientes' ? 'NO HAY PREGUNTAS ESPERANDO.' : 'NO HAY REPORTES ABIERTOS. ¡TODO LIMPIO!'}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((q) => (
            <li key={q.id}>
              <AdminQuestionItem
                mode={tab === 'pendientes' ? 'pending' : 'reported'}
                subjects={subjects}
                question={{
                  ...q,
                  createdAt: q.createdAt.toISOString(),
                  reports: (
                    ('reports' in q ? q.reports : []) as {
                      category: string
                      message: string | null
                      createdAt: Date | string
                      username: string | null
                    }[]
                  ).map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
