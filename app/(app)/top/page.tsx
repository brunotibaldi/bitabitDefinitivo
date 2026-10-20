import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MathText } from '@/components/math-text'
import { VoteBar } from '@/components/game/vote-bar'
import { getTopQuestions } from '@/lib/game/queries'
import { TYPE_META } from '@/lib/game/question-input'
import { requireUser } from '@/lib/session'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Top preguntas — Bit a Bit' }
export const dynamic = 'force-dynamic'

const MEDALS = ['bg-game-yellow', 'bg-secondary-foreground/70', 'bg-game-red']

export default async function TopPage() {
  const { profile } = await requireUser()
  const top = await getTopQuestions(profile.userId, 30)

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-3">
        <span className="font-pixel text-[10px] text-game-green">{'> HALL OF FAME'}</span>
        <h1 className="font-pixel text-lg leading-relaxed text-primary text-shadow-pixel sm:text-xl">TOP PREGUNTAS</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Las preguntas mejor votadas por la comunidad. Votá con 👍 o 👎 en cualquier pregunta del scroll para moverlas acá.
        </p>
      </header>

      {top.length === 0 ? (
        <div className="pixel-box flex flex-col items-center gap-4 bg-card p-8 text-center">
          <p className="font-pixel text-[10px] leading-relaxed text-muted-foreground">TODAVÍA NADIE VOTÓ.</p>
          <Link href="/" className="pixel-btn bg-primary px-4 py-3 font-pixel text-[10px] text-primary-foreground">
            {'▶ IR A JUGAR'}
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {top.map((q, i) => (
            <li
              key={q.id}
              className="flex animate-pop-in gap-3 border-3 border-ink bg-card p-3 shadow-[4px_4px_0_0_var(--ink)]"
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center border-3 border-ink font-pixel text-[11px]',
                  i < 3 ? cn(MEDALS[i], 'text-ink') : 'bg-secondary text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold" style={{ color: q.subjectColor }}>
                    {q.subjectShort}
                  </span>
                  <span>{TYPE_META[q.type].label}</span>
                  {q.authorUsername && <span>· por @{q.authorUsername}</span>}
                </span>
                <p className="text-pretty font-bold leading-snug">
                  <MathText text={q.prompt} />
                </p>
                <VoteBar questionId={q.id} upvotes={q.upvotes} downvotes={q.downvotes} myVote={q.myVote} />
              </div>
            </li>
          ))}
        </ol>
      )}

      <Link href="/crear" className="pixel-btn flex items-center justify-center gap-2 bg-game-blue py-3 font-pixel text-[10px] text-ink">
        <Plus className="size-4" aria-hidden="true" /> CREAR LA TUYA
      </Link>
    </main>
  )
}
