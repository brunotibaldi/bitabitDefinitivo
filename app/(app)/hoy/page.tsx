import type { Metadata } from 'next'
import { MessageCircle, Users } from 'lucide-react'
import { DailyComments } from '@/components/daily-comments'
import { MathText } from '@/components/math-text'
import { QuestionCard } from '@/components/question-card'
import { formatLongDate, localDate } from '@/lib/game/dates'
import { getDailyDebate } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Pregunta del día — Bit a Bit' }
export const dynamic = 'force-dynamic'

export default async function HoyPage() {
  const { profile } = await requireUser()
  const data = await getDailyDebate(profile.userId)
  const today = localDate()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-streak">Pregunta del día</span>
        <h1 className="text-balance text-2xl font-semibold tracking-tight first-letter:uppercase md:text-3xl">
          {formatLongDate(today)}
        </h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          La misma para todos. Respondela, ganá el doble de puntos y después debatila con el resto.
        </p>
      </header>

      {!data ? (
        <p className="rounded-2xl border bg-card p-6 text-muted-foreground">Todavía no hay preguntas cargadas.</p>
      ) : (
        <>
          <QuestionCard
            question={data.daily}
            isDaily
            initial={
              data.mine
                ? {
                    selectedIndex: data.mine.selectedIndex,
                    correctIndex: data.mine.correctIndex,
                    isCorrect: data.mine.isCorrect,
                    explanation: data.mine.explanation,
                    points: data.mine.points,
                  }
                : null
            }
          />

          {data.mine ? (
            <>
              <Distribution
                options={data.daily.options}
                correctIndex={data.mine.correctIndex}
                mine={data.mine.selectedIndex}
                distribution={data.distribution}
              />
              <section className="flex flex-col gap-4" aria-labelledby="debate-title">
                <h2 id="debate-title" className="flex items-center gap-2 text-lg font-semibold">
                  <MessageCircle className="size-5 text-primary" aria-hidden="true" />
                  Debate
                  <span className="font-mono text-sm font-normal text-muted-foreground">{data.comments.length}</span>
                </h2>
                <DailyComments
                  meId={profile.userId}
                  comments={data.comments.map((c) => ({
                    ...c,
                    username: c.username ?? '',
                    avatarColor: c.avatarColor ?? 'emerald',
                    createdAt: c.createdAt.toISOString(),
                  }))}
                />
              </section>
            </>
          ) : (
            <p className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
              <Users className="size-5 shrink-0" aria-hidden="true" />
              Respondé para ver qué eligió el resto y sumarte al debate.
            </p>
          )}
        </>
      )}
    </main>
  )
}

function Distribution({
  options,
  correctIndex,
  mine,
  distribution,
}: {
  options: string[]
  correctIndex: number
  mine: number
  distribution: { selectedIndex: number; count: number }[]
}) {
  const answered = distribution.reduce((a, d) => a + d.count, 0)
  const total = answered || 1
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5" aria-labelledby="dist-title">
      <h2 id="dist-title" className="flex items-baseline justify-between text-sm font-semibold">
        Qué respondió la gente
        <span className="font-mono text-xs font-normal text-muted-foreground">{answered} respuestas</span>
      </h2>
      <ul className="flex flex-col gap-2.5">
        {options.map((opt, i) => {
          const count = distribution.find((d) => d.selectedIndex === i)?.count ?? 0
          const pct = Math.round((count / total) * 100)
          const correct = i === correctIndex
          return (
            <li key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={cn('min-w-0 truncate', correct && 'font-medium text-primary')}>
                  <MathText text={opt} />
                  {i === mine && <span className="ml-2 font-mono text-xs text-muted-foreground">(vos)</span>}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full', correct ? 'bg-primary' : 'bg-muted-foreground/40')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
