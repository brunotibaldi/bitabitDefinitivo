import type { Metadata } from 'next'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { createQuestion, getMyQuestions } from '@/app/actions/game'
import { QuestionBuilder } from '@/components/question-builder'
import { MathText } from '@/components/math-text'
import { getSubjectOptions } from '@/lib/game/admin-queries'
import { TYPE_META } from '@/lib/game/question-input'
import { requireUser } from '@/lib/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Crear pregunta — Bit a Bit' }
export const dynamic = 'force-dynamic'

const STATUS = {
  pending: { label: 'EN REVISIÓN', className: 'bg-game-yellow' },
  approved: { label: 'PUBLICADA', className: 'bg-game-green' },
  rejected: { label: 'RECHAZADA', className: 'bg-game-red' },
  flagged: { label: 'EN REVISIÓN', className: 'bg-game-yellow' },
} as const

export default async function CrearPage() {
  const { profile } = await requireUser()
  const [subjects, mine] = await Promise.all([getSubjectOptions(), getMyQuestions()])
  const ordered = [
    ...subjects.filter((s) => profile.subjectIds.includes(s.id)),
    ...subjects.filter((s) => !profile.subjectIds.includes(s.id)),
  ]

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-3">
        <span className="font-pixel text-[10px] text-game-blue">{'> MODO CREADOR'}</span>
        <h1 className="text-balance font-pixel text-lg leading-relaxed text-primary text-shadow-pixel sm:text-xl">
          CREÁ UNA PREGUNTA
        </h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Armá una pregunta para toda la comunidad. El admin la revisa y, si se aprueba, aparece en el scroll de todos. Los demás
          la votan y las mejores suben al Top.
        </p>
      </header>

      <section className="pixel-box bg-card p-4 sm:p-6" aria-label="Formulario de pregunta">
        <QuestionBuilder subjects={ordered} onSubmit={createQuestion} />
      </section>

      {mine.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="mine-title">
          <h2 id="mine-title" className="font-pixel text-xs text-muted-foreground">
            TUS PREGUNTAS · {mine.length}
          </h2>
          <ul className="flex flex-col gap-2">
            {mine.map((q) => (
              <li key={q.id} className="flex items-center gap-3 border-3 border-ink bg-card px-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {q.subjectShort} · {TYPE_META[q.type].label}
                  </span>
                  <span className="line-clamp-2 text-sm font-bold">
                    <MathText text={q.prompt} />
                  </span>
                </div>
                {q.status === 'approved' && (
                  <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                    <ThumbsUp className="size-3.5 text-game-green" aria-label="votos positivos" />
                    {q.upvotes}
                    <ThumbsDown className="size-3.5 text-game-red" aria-label="votos negativos" />
                    {q.downvotes}
                  </span>
                )}
                <span className={cn('shrink-0 border-2 border-ink px-1.5 py-1 font-pixel text-[7px] text-ink', STATUS[q.status].className)}>
                  {STATUS[q.status].label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
