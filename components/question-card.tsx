'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Flag, Flame, X, Zap } from 'lucide-react'
import { reportQuestion, submitAnswer } from '@/app/actions/game'
import type { PublicQuestion } from '@/lib/game/queries'
import { cn } from '@/lib/utils'
import { MathText } from './math-text'
import { useStats } from './stats-provider'
import { subjectColor } from './user-avatar'

export type Revealed = {
  selectedIndex: number
  correctIndex: number
  isCorrect: boolean
  explanation: string
  points: number
  comboBonus?: number
  streakExtended?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

export function QuestionCard({
  question,
  isDaily = false,
  initial,
  footer,
}: {
  question: PublicQuestion
  isDaily?: boolean
  initial?: Revealed | null
  footer?: React.ReactNode
}) {
  const stats = useStats()
  const router = useRouter()
  const [revealed, setRevealed] = useState<Revealed | null>(initial ?? null)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const [isPending, startTransition] = useTransition()

  function choose(index: number) {
    if (revealed || isPending) return
    setPendingIndex(index)
    setError(null)
    startTransition(async () => {
      const res = await submitAnswer({ questionId: question.id, selectedIndex: index, isDaily })
      setPendingIndex(null)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRevealed({
        selectedIndex: index,
        correctIndex: res.correctIndex,
        isCorrect: res.isCorrect,
        explanation: res.explanation,
        points: res.points,
        comboBonus: res.comboBonus,
        streakExtended: res.streakExtended,
      })
      stats.apply({
        totalPoints: res.totalPoints,
        addPoints: res.points,
        streak: res.streak,
        todayFeedCount: res.todayFeedCount,
        ...(isDaily ? { dailyDone: true } : {}),
        ...(res.streakExtended ? { streakDoneToday: true } : {}),
      })
      if (isDaily) router.refresh()
    })
  }

  function report() {
    setReported(true)
    startTransition(() => reportQuestion(question.id, 'user_report'))
  }

  const color = subjectColor(question.subjectColor)

  return (
    <article
      className="relative flex w-full flex-col gap-6 rounded-3xl border bg-card p-5 shadow-2xl shadow-background/50 sm:p-7"
      aria-label={`Pregunta de ${question.subjectName}`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="truncate font-semibold uppercase tracking-wider" style={{ color }}>
            {question.subjectShort}
          </span>
          {question.topic && (
            <span className="truncate text-muted-foreground">
              {'/ '}
              {question.topic}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1" aria-label={`Dificultad ${question.difficulty} de 3`}>
          {[1, 2, 3].map((d) => (
            <span
              key={d}
              className={cn('h-1.5 w-3 rounded-full', d <= question.difficulty ? 'bg-foreground/70' : 'bg-muted')}
            />
          ))}
        </div>
      </header>

      <h2 className="text-pretty text-xl font-semibold leading-snug sm:text-2xl">
        <MathText text={question.prompt} />
      </h2>

      <div
        role="group"
        aria-label="Opciones"
        className={cn('grid gap-2.5', question.type === 'true_false' && 'grid-cols-2')}
      >
        {question.options.map((opt, i) => {
          const isCorrect = revealed?.correctIndex === i
          const isWrongPick = revealed && revealed.selectedIndex === i && !revealed.isCorrect
          const dimmed = revealed && !isCorrect && !isWrongPick
          return (
            <button
              key={i}
              type="button"
              disabled={!!revealed || isPending}
              onClick={() => choose(i)}
              aria-pressed={revealed?.selectedIndex === i}
              className={cn(
                'group flex min-h-14 items-center gap-3 rounded-2xl border bg-secondary/60 px-4 py-3 text-left text-base leading-relaxed transition-all',
                !revealed && 'hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent active:translate-y-0',
                pendingIndex === i && 'animate-pulse border-primary/60',
                isCorrect && 'border-primary bg-primary/15 text-foreground',
                isWrongPick && 'border-destructive bg-destructive/15',
                dimmed && 'opacity-45',
                question.type === 'true_false' && 'justify-center text-center font-semibold',
              )}
            >
              {question.type !== 'true_false' && (
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold text-muted-foreground',
                    isCorrect && 'border-primary bg-primary text-primary-foreground',
                    isWrongPick && 'border-destructive bg-destructive text-destructive-foreground',
                  )}
                  aria-hidden="true"
                >
                  {isCorrect ? <Check className="size-4" /> : isWrongPick ? <X className="size-4" /> : LETTERS[i]}
                </span>
              )}
              <MathText text={opt} />
            </button>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold',
                  revealed.isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive/20 text-destructive',
                )}
              >
                {revealed.isCorrect ? '¡Correcto!' : 'Casi'}
              </span>
              {revealed.points > 0 && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="font-mono text-sm font-semibold text-primary"
                >
                  +{revealed.points} pts
                </motion.span>
              )}
              {!!revealed.comboBonus && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                  <Zap className="size-3.5" aria-hidden="true" />
                  Combo x5 +{revealed.comboBonus}
                </span>
              )}
              {revealed.streakExtended && (
                <span className="flex items-center gap-1 rounded-full bg-streak/15 px-2.5 py-1 font-mono text-xs font-semibold text-streak">
                  <Flame className="size-3.5 fill-streak" aria-hidden="true" />
                  Racha: {stats.streak} {stats.streak === 1 ? 'día' : 'días'}
                </span>
              )}
            </div>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              <MathText text={revealed.explanation} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        {footer ?? <span className="font-mono">#{question.id}</span>}
        <button
          type="button"
          onClick={report}
          disabled={reported}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:text-foreground disabled:opacity-60"
        >
          <Flag className="size-3.5" aria-hidden="true" />
          {reported ? 'Reportada, gracias' : 'Reportar error'}
        </button>
      </footer>
    </article>
  )
}
