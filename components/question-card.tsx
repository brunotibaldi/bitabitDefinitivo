'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, Flame, RotateCcw, X, Zap } from 'lucide-react'
import { submitAnswer } from '@/app/actions/game'
import type { PublicQuestion } from '@/lib/game/queries'
import { TYPE_META } from '@/lib/game/question-input'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'
import { BlankPrompt, QuestionContextView } from './game/question-context'
import { PixelBurst } from './game/pixel-burst'
import { ReportButton } from './game/report-dialog'
import { VoteBar } from './game/vote-bar'
import { MathText } from './math-text'
import { useStats } from './stats-provider'

export type Revealed = {
  selectedIndex: number
  selectedOrder?: number[] | null
  correctIndex: number
  correctOrder?: number[] | null
  isCorrect: boolean
  explanation: string
  points: number
  comboBonus?: number
  combo?: number
  streakExtended?: boolean
}

const QUADS = [
  { bg: 'bg-game-red', text: 'text-game-red', key: 'A' },
  { bg: 'bg-game-blue', text: 'text-game-blue', key: 'B' },
  { bg: 'bg-game-yellow', text: 'text-game-yellow', key: 'C' },
  { bg: 'bg-game-green', text: 'text-game-green', key: 'D' },
] as const

const TYPE_COLOR: Record<string, string> = {
  mcq: 'bg-game-blue',
  true_false: 'bg-game-green',
  fill_blank: 'bg-game-yellow',
  definition: 'bg-game-blue',
  intruder: 'bg-game-red',
  proof_gap: 'bg-game-yellow',
  code_output: 'bg-game-green',
  order: 'bg-game-red',
}

function seededShuffle(n: number, seed: number) {
  const idx = Array.from({ length: n }, (_, i) => i)
  let s = seed * 9301 + 49297
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  if (idx.every((v, i) => v === i) && n > 1) idx.reverse()
  return idx
}

export function QuestionCard({
  question,
  isDaily = false,
  initial = null,
}: {
  question: PublicQuestion
  isDaily?: boolean
  initial?: Revealed | null
}) {
  const [revealed, setRevealed] = useState<Revealed | null>(initial)
  const [pick, setPick] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const stats = useStats()
  const meta = TYPE_META[question.type]

  const displayOrder = useMemo(
    () => (question.type === 'order' ? seededShuffle(question.options.length, question.id) : []),
    [question.type, question.options.length, question.id],
  )

  function send(selectedIndex: number, selectedOrder?: number[]) {
    setError(null)
    startTransition(async () => {
      const res = await submitAnswer({ questionId: question.id, selectedIndex, selectedOrder, isDaily })
      if (!res.ok) {
        setError(res.error)
        setPick(null)
        return
      }
      if (res.isCorrect) {
        sfx.correct()
        setTimeout(sfx.coin, 320)
        if (res.comboBonus > 0) setTimeout(sfx.combo, 650)
      } else {
        sfx.wrong()
      }
      if (res.streakExtended) setTimeout(sfx.streak, res.comboBonus > 0 ? 1400 : 800)
      setRevealed({
        selectedIndex,
        selectedOrder: selectedOrder ?? null,
        correctIndex: res.correctIndex,
        correctOrder: res.correctOrder,
        isCorrect: res.isCorrect,
        explanation: res.explanation,
        points: res.points,
        comboBonus: res.comboBonus,
        combo: res.combo,
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
    })
  }

  function choose(i: number) {
    if (revealed || isPending) return
    sfx.select()
    setPick(i)
    send(i)
  }

  const filled =
    revealed && (question.type === 'fill_blank' || question.type === 'proof_gap')
      ? question.options[revealed.correctIndex]
      : null

  return (
    <article
      className={cn(
        'pixel-box relative flex w-full flex-col bg-card',
        revealed && !initial && (revealed.isCorrect ? 'animate-flash' : 'animate-shake'),
      )}
      aria-label={`Pregunta de ${question.subjectName}`}
    >
      <header className="flex items-center justify-between gap-2 border-b-3 border-ink bg-ink/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('shrink-0 border-2 border-ink px-1.5 py-1 font-pixel text-[8px] text-ink', TYPE_COLOR[question.type])}>
            {meta.short}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground" title={question.subjectName}>
            {question.subjectShort}
            {question.topic && <span className="font-normal normal-case"> · {question.topic}</span>}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isDaily && <span className="animate-bob font-pixel text-[8px] text-primary">x2 PTS</span>}
          <span className="flex gap-0.5" aria-label={`Dificultad ${question.difficulty} de 3`}>
            {[1, 2, 3].map((d) => (
              <span
                key={d}
                className={cn('size-2.5 border-2 border-ink', d <= question.difficulty ? 'bg-game-red' : 'bg-secondary')}
              />
            ))}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <p className="text-pretty text-lg font-bold leading-snug sm:text-xl">
          {question.type === 'fill_blank' ? (
            <BlankPrompt prompt={question.prompt} filled={filled} />
          ) : (
            <MathText text={question.prompt} />
          )}
        </p>

        <QuestionContextView type={question.type} context={question.context} filled={filled} />

        {question.type === 'order' ? (
          <OrderBoard
            options={question.options}
            displayOrder={displayOrder}
            order={revealed?.selectedOrder ?? order}
            correctOrder={revealed?.correctOrder ?? null}
            locked={!!revealed || isPending}
            onToggle={(i) => {
              sfx.tap()
              setOrder((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))
            }}
            onReset={() => setOrder([])}
            onSubmit={() => send(0, order)}
            isPending={isPending}
          />
        ) : (
          <AnswerGrid
            type={question.type}
            options={question.options}
            pick={revealed?.selectedIndex ?? pick}
            correctIndex={revealed?.correctIndex ?? null}
            disabled={!!revealed || isPending}
            onChoose={choose}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-game-red">
            {error}
          </p>
        )}

        {revealed && <ResultPanel revealed={revealed} animate={!initial} />}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t-3 border-ink px-3 py-2">
        <VoteBar
          questionId={question.id}
          upvotes={question.upvotes}
          downvotes={question.downvotes}
          myVote={question.myVote}
        />
        <div className="flex items-center gap-2">
          {question.authorUsername && (
            <span className="text-xs text-muted-foreground">
              por <span className="font-bold text-game-blue">@{question.authorUsername}</span>
            </span>
          )}
          <ReportButton questionId={question.id} />
        </div>
      </footer>
    </article>
  )
}

function AnswerGrid({
  type,
  options,
  pick,
  correctIndex,
  disabled,
  onChoose,
}: {
  type: PublicQuestion['type']
  options: string[]
  pick: number | null
  correctIndex: number | null
  disabled: boolean
  onChoose: (i: number) => void
}) {
  const isTF = type === 'true_false'
  const long = options.some((o) => o.length > 64)
  const revealed = correctIndex !== null

  return (
    <div className={cn('grid gap-3', isTF || !long ? 'grid-cols-2' : 'grid-cols-1')} role="group" aria-label="Opciones">
      {options.map((opt, i) => {
        const quad = isTF ? QUADS[i === 0 ? 3 : 0] : QUADS[i % 4]
        const isCorrect = revealed && i === correctIndex
        const isWrongPick = revealed && i === pick && i !== correctIndex
        const dim = revealed && !isCorrect && !isWrongPick
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChoose(i)}
            disabled={disabled}
            aria-label={`Opción ${quad.key}: ${opt}`}
            className={cn(
              'pixel-btn group relative flex min-h-20 items-center gap-3 px-3 py-3 text-left text-ink',
              quad.bg,
              isTF && 'min-h-24 justify-center text-center',
              !revealed && pick === i && 'animate-pulse',
              dim && 'opacity-25 saturate-0',
              isCorrect && 'z-10 outline-4 outline-offset-2 outline-foreground',
              isWrongPick && 'animate-shake',
              disabled && 'cursor-default',
            )}
            style={{ animationDelay: revealed ? undefined : `${i * 60}ms` }}
          >
            {!isTF && (
              <span className="flex size-7 shrink-0 items-center justify-center border-2 border-ink bg-ink/15 font-pixel text-[10px]">
                {isCorrect ? <Check className="size-4" strokeWidth={4} /> : isWrongPick ? <X className="size-4" strokeWidth={4} /> : quad.key}
              </span>
            )}
            <span className={cn('min-w-0 flex-1 text-sm font-bold leading-snug sm:text-base', isTF && 'font-pixel text-xs sm:text-sm')}>
              {isTF && isCorrect && <Check className="mx-auto mb-1 size-5" strokeWidth={4} />}
              {isTF && isWrongPick && <X className="mx-auto mb-1 size-5" strokeWidth={4} />}
              <MathText text={opt} />
            </span>
            {isCorrect && <PixelBurst seed={i + 1} />}
          </button>
        )
      })}
    </div>
  )
}

function OrderBoard({
  options,
  displayOrder,
  order,
  correctOrder,
  locked,
  onToggle,
  onReset,
  onSubmit,
  isPending,
}: {
  options: string[]
  displayOrder: number[]
  order: number[]
  correctOrder: number[] | null
  locked: boolean
  onToggle: (i: number) => void
  onReset: () => void
  onSubmit: () => void
  isPending: boolean
}) {
  const revealed = correctOrder !== null
  const complete = order.length === options.length

  if (revealed) {
    return (
      <ol className="flex flex-col gap-2" aria-label="Orden correcto">
        {correctOrder.map((optIdx, pos) => {
          const ok = order[pos] === optIdx
          return (
            <li
              key={optIdx}
              className={cn(
                'flex animate-pop-in items-center gap-3 border-3 border-ink px-3 py-2.5 text-sm font-bold text-ink',
                ok ? 'bg-game-green' : 'bg-game-yellow',
              )}
              style={{ animationDelay: `${pos * 90}ms` }}
            >
              <span className="flex size-7 shrink-0 items-center justify-center border-2 border-ink bg-ink/15 font-pixel text-[10px]">
                {pos + 1}
              </span>
              <MathText text={options[optIdx]} className="flex-1" />
              {ok ? <Check className="size-4" strokeWidth={4} /> : <X className="size-4" strokeWidth={4} />}
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Tocá los pasos en el orden correcto.</p>
      <ul className="flex flex-col gap-2">
        {displayOrder.map((optIdx, i) => {
          const pos = order.indexOf(optIdx)
          const quad = QUADS[i % 4]
          return (
            <li key={optIdx}>
              <button
                type="button"
                onClick={() => onToggle(optIdx)}
                disabled={locked}
                aria-pressed={pos >= 0}
                className={cn(
                  'pixel-btn flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold',
                  pos >= 0 ? cn(quad.bg, 'text-ink') : 'bg-secondary text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center border-2 border-ink font-pixel text-[10px]',
                    pos >= 0 ? 'animate-pop-in bg-ink text-foreground' : 'bg-ink/30',
                  )}
                >
                  {pos >= 0 ? pos + 1 : ''}
                </span>
                <MathText text={options[optIdx]} className="flex-1" />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={locked || order.length === 0}
          className="pixel-btn flex items-center gap-2 bg-secondary px-3 py-2.5 text-xs font-bold disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reiniciar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={locked || !complete}
          className="pixel-btn flex-1 bg-primary py-2.5 font-pixel text-[10px] text-primary-foreground disabled:opacity-40"
        >
          {isPending ? 'CHEQUEANDO…' : complete ? 'CONFIRMAR' : `${order.length}/${options.length}`}
        </button>
      </div>
    </div>
  )
}

function ResultPanel({ revealed, animate }: { revealed: Revealed; animate: boolean }) {
  return (
    <div className={cn('relative flex flex-col gap-3', animate && 'animate-pop-in')}>
      {animate && revealed.points > 0 && (
        <span
          className="pointer-events-none absolute -top-6 right-4 animate-float-up font-pixel text-lg text-primary text-shadow-pixel"
          aria-hidden="true"
        >
          +{revealed.points}
        </span>
      )}
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-3 border-ink px-4 py-3 text-ink',
          revealed.isCorrect ? 'bg-game-green' : 'bg-game-red',
        )}
        role="status"
      >
        <span className="font-pixel text-xs sm:text-sm">{revealed.isCorrect ? '¡CORRECTO!' : 'GAME OVER…'}</span>
        <span className="font-pixel text-xs tabular-nums">{revealed.points > 0 ? `+${revealed.points} PTS` : '+0'}</span>
      </div>

      {(revealed.comboBonus ?? 0) > 0 && (
        <div className="flex items-center justify-center gap-2 border-3 border-ink bg-primary py-2 font-pixel text-[10px] text-primary-foreground animate-bob">
          <Zap className="size-4 fill-current" aria-hidden="true" />
          COMBO x{revealed.combo} · +{revealed.comboBonus} BONUS
        </div>
      )}
      {revealed.streakExtended && (
        <div className="flex items-center justify-center gap-2 border-3 border-ink bg-streak py-2 font-pixel text-[10px] text-streak-foreground">
          <Flame className="size-4 fill-current" aria-hidden="true" />
          ¡RACHA ASEGURADA HOY!
        </div>
      )}

      <div className="border-l-4 border-primary bg-ink/40 px-4 py-3">
        <span className="mb-1 block font-pixel text-[8px] text-primary">POR QUÉ</span>
        <p className="text-pretty text-sm leading-relaxed">
          <MathText text={revealed.explanation} />
        </p>
      </div>
    </div>
  )
}
