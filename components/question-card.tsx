'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowLeftRight, Check, Flame, Lightbulb, Lock, RotateCcw, Snowflake, X } from 'lucide-react'
import { buyPowerup, revealHint, submitAnswer, type AnswerStats } from '@/app/actions/game'
import type { PowerupKind } from '@/lib/db/schema'
import type { PublicQuestion } from '@/lib/game/queries'
import { TYPE_META } from '@/lib/game/question-input'
import { fireLevel, HINT_PENALTY, POWERUPS } from '@/lib/game/rules'
import { subjectTheme } from '@/lib/game/subject-theme'
import { sfx } from '@/lib/sfx'
import { shake } from '@/lib/shake'
import { cn } from '@/lib/utils'
import { BitIcon } from './game/fire-meter'
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
  fireBonus?: number
  fireBonusPct?: number
  fire?: number
  prevFire?: number
  bitsEarned?: number
  hintUsed?: boolean
  stats?: AnswerStats
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
  match: 'bg-game-yellow',
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
  const isOrder = question.type === 'order'
  const isMatch = question.type === 'match'
  const firstItemInit = question.firstItem ?? null

  const [revealed, setRevealed] = useState<Revealed | null>(initial)
  const [pick, setPick] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>(firstItemInit !== null && isOrder ? [firstItemInit] : [])
  const [arrangement, setArrangement] = useState<number[]>(() => {
    const base = question.options.map((_, i) => i)
    return firstItemInit !== null && isMatch ? lockFirst(base, firstItemInit) : base
  })
  const [hint, setHint] = useState<string | null>(question.hint ?? null)
  const [removed, setRemoved] = useState<number[]>(question.removed ?? [])
  const [firstItem, setFirstItem] = useState<number | null>(firstItemInit)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [assistPending, startAssist] = useTransition()
  const stats = useStats()
  const meta = TYPE_META[question.type]

  const displayOrder = useMemo(
    () => (isOrder ? seededShuffle(question.options.length, question.id) : []),
    [isOrder, question.options.length, question.id],
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
      const levelUp = fireLevel(res.fire) > fireLevel(res.prevFire)
      if (res.isCorrect) {
        sfx.correct()
        setTimeout(sfx.coin, 320)
        shake(levelUp ? 'boom' : 'soft')
        if (levelUp) setTimeout(sfx.combo, 650)
      } else {
        sfx.wrong()
        shake('hard')
      }
      if (res.streakExtended) setTimeout(sfx.streak, levelUp ? 1400 : 800)
      setRevealed({
        selectedIndex,
        selectedOrder: selectedOrder ?? null,
        correctIndex: res.correctIndex,
        correctOrder: res.correctOrder,
        isCorrect: res.isCorrect,
        explanation: res.explanation,
        points: res.points,
        fireBonus: res.fireBonus,
        fireBonusPct: res.fireBonusPct,
        fire: res.fire,
        prevFire: res.prevFire,
        bitsEarned: res.bitsEarned,
        hintUsed: res.hintUsed,
        stats: res.stats,
        streakExtended: res.streakExtended,
      })
      stats.apply({
        totalPoints: res.totalPoints,
        addPoints: res.points,
        streak: res.streak,
        todayFeedCount: res.todayFeedCount,
        fire: res.fire,
        bits: res.bits,
        ...(isDaily ? { dailyDone: true } : {}),
        ...(res.streakExtended ? { streakDoneToday: true } : {}),
      })
    })
  }

  function choose(i: number) {
    if (revealed || isPending || removed.includes(i)) return
    sfx.select()
    shake('tap')
    setPick(i)
    send(i)
  }

  function useHint() {
    setError(null)
    startAssist(async () => {
      const res = await revealHint(question.id)
      if (!res.ok) return setError(res.error ?? 'No se pudo mostrar la pista')
      sfx.send()
      setHint(res.hint ?? null)
    })
  }

  function usePowerup(kind: PowerupKind) {
    setError(null)
    startAssist(async () => {
      const res = await buyPowerup({ questionId: question.id, kind })
      if (!res.ok) {
        sfx.wrong()
        shake('soft')
        return setError(res.error)
      }
      sfx.coin()
      shake('soft')
      stats.apply({ bits: res.bits })
      setRemoved(res.removed)
      if (res.firstItem !== null) {
        const f = res.firstItem
        setFirstItem(f)
        if (isOrder) setOrder((o) => [f, ...o.filter((x) => x !== f)])
        if (isMatch) setArrangement((a) => lockFirst(a, f))
      }
    })
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
      style={subjectTheme(question.subjectId).cardStyle}
      aria-label={`Pregunta de ${question.subjectName}`}
    >
      <header className="flex items-center justify-between gap-2 border-b-3 border-ink bg-[var(--subj)] px-3 py-2 text-ink">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('shrink-0 border-2 border-ink px-1.5 py-1 font-pixel text-[8px] text-ink', TYPE_COLOR[question.type])}>
            {meta.short}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wide" title={question.subjectName}>
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

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:gap-5 lg:p-8">
        <p className="text-pretty text-lg font-bold leading-snug sm:text-xl lg:text-2xl">
          {question.type === 'fill_blank' ? (
            <BlankPrompt prompt={question.prompt} filled={filled} />
          ) : (
            <MathText text={question.prompt} />
          )}
        </p>

        <QuestionContextView type={question.type} context={question.context} filled={filled} />

        {hint && !revealed && (
          <div className="flex animate-pop-in items-start gap-3 border-3 border-dashed border-primary bg-primary/10 px-3 py-2.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-pretty text-sm leading-relaxed">
              <span className="sr-only">Pista: </span>
              <MathText text={hint} />
            </p>
          </div>
        )}

        {!revealed && (
          <AssistBar
            question={question}
            bits={stats.bits}
            hintShown={!!hint}
            removed={removed}
            firstItem={firstItem}
            disabled={isPending || assistPending}
            onHint={useHint}
            onPowerup={usePowerup}
          />
        )}

        {isOrder ? (
          <OrderBoard
            options={question.options}
            displayOrder={displayOrder}
            order={revealed?.selectedOrder ?? order}
            correctOrder={revealed?.correctOrder ?? null}
            lockedItem={firstItem}
            locked={!!revealed || isPending}
            onToggle={(i) => {
              if (i === firstItem) return
              sfx.tap()
              shake('tap')
              setOrder((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))
            }}
            onReset={() => setOrder(firstItem !== null ? [firstItem] : [])}
            onSubmit={() => send(0, order)}
            isPending={isPending}
            correctPct={revealed?.stats?.correctPct}
            total={revealed?.stats?.total}
          />
        ) : isMatch ? (
          <MatchBoard
            left={question.context?.left ?? []}
            options={question.options}
            arrangement={revealed?.selectedOrder ?? arrangement}
            correctOrder={revealed?.correctOrder ?? null}
            lockFirst={firstItem !== null}
            locked={!!revealed || isPending}
            onSwap={(a, b) => {
              sfx.tap()
              shake('tap')
              setArrangement((arr) => {
                const next = [...arr]
                ;[next[a], next[b]] = [next[b], next[a]]
                return next
              })
            }}
            onSubmit={() => send(0, arrangement)}
            isPending={isPending}
            correctPct={revealed?.stats?.correctPct}
            total={revealed?.stats?.total}
          />
        ) : (
          <AnswerGrid
            type={question.type}
            options={question.options}
            pick={revealed?.selectedIndex ?? pick}
            correctIndex={revealed?.correctIndex ?? null}
            removed={revealed ? [] : removed}
            stats={revealed?.stats ?? null}
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

/** Moves `slot` into row 0 of a match arrangement. */
function lockFirst(arr: number[], slot: number) {
  const next = [...arr]
  const at = next.indexOf(slot)
  if (at > 0) [next[0], next[at]] = [next[at], next[0]]
  return next
}

const CHOICE_TYPES: PublicQuestion['type'][] = ['mcq', 'fill_blank', 'definition', 'intruder', 'proof_gap', 'code_output']

function AssistBar({
  question,
  bits,
  hintShown,
  removed,
  firstItem,
  disabled,
  onHint,
  onPowerup,
}: {
  question: PublicQuestion
  bits: number
  hintShown: boolean
  removed: number[]
  firstItem: number | null
  disabled: boolean
  onHint: () => void
  onPowerup: (kind: PowerupKind) => void
}) {
  const isSequence = question.type === 'order' || question.type === 'match'
  const isChoice = CHOICE_TYPES.includes(question.type)
  const wrongLeft = question.options.length - 1 - removed.length

  const powerups: { kind: PowerupKind; available: boolean }[] = isSequence
    ? [{ kind: 'first_item', available: firstItem === null }]
    : isChoice
      ? [
          { kind: 'remove_one', available: wrongLeft - 1 >= 1 },
          { kind: 'remove_two', available: wrongLeft - 2 >= 1 },
        ]
      : []

  const showHint = question.hasHint && !hintShown
  if (!showHint && powerups.every((p) => !p.available)) return null

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ayudas">
      {showHint && (
        <button
          type="button"
          onClick={onHint}
          disabled={disabled}
          className="pixel-btn flex items-center gap-1.5 bg-secondary px-2.5 py-1.5 text-xs font-bold text-foreground disabled:opacity-40"
          title={`Usar la pista: esta pregunta da ${Math.round((1 - HINT_PENALTY) * 100)}% de los puntos`}
        >
          <Lightbulb className="size-3.5 text-primary" aria-hidden="true" />
          Pista
          <span className="font-pixel text-[8px] text-game-red">-{Math.round(HINT_PENALTY * 100)}%</span>
        </button>
      )}
      {powerups
        .filter((p) => p.available)
        .map(({ kind }) => {
          const p = POWERUPS[kind]
          const affordable = bits >= p.cost
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onPowerup(kind)}
              disabled={disabled || !affordable}
              className={cn(
                'pixel-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold disabled:opacity-40',
                affordable ? 'bg-game-blue text-ink' : 'bg-secondary text-muted-foreground',
              )}
              title={affordable ? `Comprar: ${p.label}` : `Te faltan ${p.cost - bits} bits`}
            >
              <span className="font-pixel text-[9px]">{p.short}</span>
              <span>{p.label}</span>
              <span className="flex items-center gap-1 border-l-2 border-ink/40 pl-1.5 font-pixel text-[8px] tabular-nums">
                {p.cost}
                <BitIcon className="size-3.5 text-[6px]" />
              </span>
            </button>
          )
        })}
    </div>
  )
}

function AnswerGrid({
  type,
  options,
  pick,
  correctIndex,
  removed,
  stats,
  disabled,
  onChoose,
}: {
  type: PublicQuestion['type']
  options: string[]
  pick: number | null
  correctIndex: number | null
  removed: number[]
  stats: AnswerStats | null
  disabled: boolean
  onChoose: (i: number) => void
}) {
  const isTF = type === 'true_false'
  const long = options.some((o) => o.length > 64)
  const revealed = correctIndex !== null

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('grid gap-3', isTF || !long ? 'grid-cols-2' : 'grid-cols-1')} role="group" aria-label="Opciones">
        {options.map((opt, i) => {
          const quad = isTF ? QUADS[i === 0 ? 3 : 0] : QUADS[i % 4]
          const isCorrect = revealed && i === correctIndex
          const isWrongPick = revealed && i === pick && i !== correctIndex
          const dim = revealed && !isCorrect && !isWrongPick
          const gone = removed.includes(i)
          const pct = stats && stats.total > 0 ? Math.round((stats.counts[i] / stats.total) * 100) : null

          if (gone) {
            return (
              <div
                key={i}
                className="flex min-h-20 animate-pop-in items-center justify-center gap-2 border-3 border-dashed border-muted-foreground/40 px-3 py-3 text-muted-foreground"
                aria-label={`Opción ${quad.key} eliminada`}
              >
                <X className="size-4" aria-hidden="true" />
                <span className="font-pixel text-[8px]">ELIMINADA</span>
              </div>
            )
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i)}
              disabled={disabled}
              aria-label={`Opción ${quad.key}: ${opt}${pct !== null ? `, ${pct}% de los jugadores` : ''}`}
              className={cn(
                'pixel-btn group relative flex min-h-20 flex-col justify-center gap-2 overflow-hidden px-3 py-3 text-left text-ink lg:min-h-24',
                quad.bg,
                isTF && 'min-h-24 items-center text-center',
                !revealed && pick === i && 'animate-pulse',
                dim && 'opacity-40 saturate-50',
                isCorrect && 'z-10 outline-4 outline-offset-2 outline-foreground',
                isWrongPick && 'animate-shake',
                disabled && 'cursor-default',
              )}
            >
              <span className={cn('flex w-full items-center gap-3', isTF && 'justify-center')}>
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
              </span>
              {pct !== null && <PercentBar pct={pct} delay={i * 90} />}
              {isCorrect && <PixelBurst seed={i + 1} />}
            </button>
          )
        })}
      </div>
      {stats && (
        <p className="text-right font-pixel text-[8px] text-muted-foreground">
          {stats.total === 1 ? 'SOS EL PRIMERO EN RESPONDER' : `${stats.total} RESPUESTAS · ${stats.correctPct}% ACERTÓ`}
        </p>
      )}
    </div>
  )
}

function PercentBar({ pct, delay }: { pct: number; delay: number }) {
  return (
    <span className="flex w-full items-center gap-2" aria-hidden="true">
      <span className="relative h-3 flex-1 border-2 border-ink bg-ink/25">
        <span
          className="absolute inset-y-0 left-0 origin-left animate-pop-in bg-ink/70"
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </span>
      <span className="w-9 text-right font-pixel text-[9px] tabular-nums">{pct}%</span>
    </span>
  )
}

function SequenceFooter({ correctPct, total }: { correctPct?: number; total?: number }) {
  if (total === undefined || correctPct === undefined) return null
  return (
    <div className="flex items-center gap-2" aria-label={`${correctPct}% de los jugadores lo armó bien`}>
      <span className="relative h-3 flex-1 border-2 border-ink bg-ink/40">
        <span className="absolute inset-y-0 left-0 animate-pop-in bg-game-green" style={{ width: `${correctPct}%` }} />
      </span>
      <span className="font-pixel text-[8px] text-muted-foreground">
        {total === 1 ? 'SOS EL PRIMERO' : `${correctPct}% LO ARMÓ BIEN`}
      </span>
    </div>
  )
}

function OrderBoard({
  options,
  displayOrder,
  order,
  correctOrder,
  lockedItem,
  locked,
  onToggle,
  onReset,
  onSubmit,
  isPending,
  correctPct,
  total,
}: {
  options: string[]
  displayOrder: number[]
  order: number[]
  correctOrder: number[] | null
  lockedItem: number | null
  locked: boolean
  onToggle: (i: number) => void
  onReset: () => void
  onSubmit: () => void
  isPending: boolean
  correctPct?: number
  total?: number
}) {
  const revealed = correctOrder !== null
  const complete = order.length === options.length

  if (revealed) {
    return (
      <div className="flex flex-col gap-3">
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
        <SequenceFooter correctPct={correctPct} total={total} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Tocá los pasos en el orden correcto.</p>
      <ul className="flex flex-col gap-2">
        {displayOrder.map((optIdx, i) => {
          const pos = order.indexOf(optIdx)
          const quad = QUADS[i % 4]
          const isLocked = optIdx === lockedItem
          return (
            <li key={optIdx}>
              <button
                type="button"
                onClick={() => onToggle(optIdx)}
                disabled={locked || isLocked}
                aria-pressed={pos >= 0}
                className={cn(
                  'pixel-btn flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold',
                  pos >= 0 ? cn(quad.bg, 'text-ink') : 'bg-secondary text-foreground',
                  isLocked && 'cursor-default',
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
                {isLocked && <Lock className="size-4" aria-label="Fijado por poder" />}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={locked || order.length <= (lockedItem !== null ? 1 : 0)}
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

function MatchBoard({
  left,
  options,
  arrangement,
  correctOrder,
  lockFirst: firstLocked,
  locked,
  onSwap,
  onSubmit,
  isPending,
  correctPct,
  total,
}: {
  left: string[]
  options: string[]
  arrangement: number[]
  correctOrder: number[] | null
  lockFirst: boolean
  locked: boolean
  onSwap: (a: number, b: number) => void
  onSubmit: () => void
  isPending: boolean
  correctPct?: number
  total?: number
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const revealed = correctOrder !== null

  function tap(row: number) {
    if (locked || (firstLocked && row === 0)) return
    if (selected === null) {
      sfx.select()
      setSelected(row)
      return
    }
    if (selected !== row) onSwap(selected, row)
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {!revealed && (
        <p className="text-xs text-muted-foreground">
          La izquierda queda fija. Tocá dos fichas de la derecha para intercambiarlas y armar las parejas.
        </p>
      )}
      <ol className="flex flex-col gap-2" aria-label="Parejas">
        {left.map((concept, row) => {
          const slot = arrangement[row]
          const ok = revealed && correctOrder[row] === slot
          const isSel = selected === row
          const rowLocked = firstLocked && row === 0
          return (
            <li
              key={row}
              className={cn('grid grid-cols-[1fr_auto_1fr] items-stretch gap-2', revealed && 'animate-pop-in')}
              style={revealed ? { animationDelay: `${row * 90}ms` } : undefined}
            >
              <div className="flex items-center border-3 border-ink bg-ink/50 px-3 py-2.5 text-sm font-bold">
                <MathText text={concept} />
              </div>
              <span
                className={cn(
                  'flex w-6 items-center justify-center font-pixel text-[10px]',
                  revealed ? (ok ? 'text-game-green' : 'text-game-red') : 'text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {revealed ? (ok ? <Check className="size-4" strokeWidth={4} /> : <X className="size-4" strokeWidth={4} />) : '='}
              </span>
              {revealed ? (
                <div
                  className={cn(
                    'flex flex-col justify-center gap-1 border-3 border-ink px-3 py-2.5 text-sm font-bold text-ink',
                    ok ? 'bg-game-green' : 'bg-game-red',
                  )}
                >
                  <MathText text={options[slot]} />
                  {!ok && (
                    <span className="text-xs font-normal">
                      Era: <MathText text={options[correctOrder[row]]} />
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => tap(row)}
                  disabled={locked || rowLocked}
                  aria-pressed={isSel}
                  aria-label={`Pareja de ${concept}: ${options[slot]}${rowLocked ? ', fijada' : ''}`}
                  className={cn(
                    'pixel-btn flex items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-ink',
                    QUADS[row % 4].bg,
                    isSel && 'animate-pulse outline-4 outline-offset-2 outline-foreground',
                    rowLocked && 'cursor-default',
                  )}
                >
                  {rowLocked ? <Lock className="size-4 shrink-0" aria-hidden="true" /> : <ArrowLeftRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />}
                  <MathText text={options[slot]} className="flex-1" />
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {revealed ? (
        <SequenceFooter correctPct={correctPct} total={total} />
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={locked}
          className="pixel-btn bg-primary py-2.5 font-pixel text-[10px] text-primary-foreground disabled:opacity-40"
        >
          {isPending ? 'CHEQUEANDO…' : 'CONFIRMAR PAREJAS'}
        </button>
      )}
    </div>
  )
}

function ResultPanel({ revealed, animate }: { revealed: Revealed; animate: boolean }) {
  const fire = revealed.fire ?? 0
  const prevFire = revealed.prevFire ?? 0
  const cooled = !revealed.isCorrect && prevFire > 0
  const levelUp = revealed.isCorrect && fireLevel(fire) > fireLevel(prevFire)

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
        <span className="flex items-center gap-2 font-pixel text-xs tabular-nums">
          {(revealed.bitsEarned ?? 0) > 0 && (
            <span className="flex items-center gap-1 border-2 border-ink bg-game-blue px-1.5 py-0.5 text-[9px]">
              +{revealed.bitsEarned}
              <BitIcon className="size-3.5 text-[6px]" />
            </span>
          )}
          {revealed.points > 0 ? `+${revealed.points} PTS` : '+0'}
        </span>
      </div>

      {revealed.isCorrect && (revealed.fireBonus ?? 0) > 0 && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 border-3 border-ink py-2 font-pixel text-[10px] text-ink',
            levelUp ? 'animate-bob bg-game-red' : 'bg-primary',
          )}
        >
          <Flame className="size-4 fill-current" aria-hidden="true" />
          {levelUp ? '¡EL FUEGO CRECE! ' : ''}x{fire} · +{revealed.fireBonusPct}% (+{revealed.fireBonus})
        </div>
      )}
      {cooled && (
        <div className="flex items-center justify-center gap-2 border-3 border-ink bg-game-blue py-2 font-pixel text-[10px] text-ink">
          <Snowflake className="size-4" aria-hidden="true" />
          {fire > 0 ? `EL FUEGO SE ENFRÍA · x${prevFire} → x${fire}` : `SE APAGÓ EL FUEGO (x${prevFire})`}
        </div>
      )}
      {revealed.hintUsed && revealed.isCorrect && (
        <p className="text-center font-pixel text-[8px] text-muted-foreground">
          USASTE PISTA · -{Math.round(HINT_PENALTY * 100)}% PTS
        </p>
      )}
      {revealed.streakExtended && (
        <div className="flex items-center justify-center gap-2 border-3 border-ink bg-streak py-2 font-pixel text-[10px] text-streak-foreground">
          <Flame className="size-4 fill-current" aria-hidden="true" />
          ¡RACHA DIARIA ASEGURADA!
        </div>
      )}

      <div className="border-l-4 border-[var(--subj)] bg-[var(--subj-soft)] px-4 py-3">
        <span className="mb-1 block font-pixel text-[8px] text-[var(--subj)]">POR QUÉ</span>
        <p className="text-pretty text-sm leading-relaxed">
          <MathText text={revealed.explanation} />
        </p>
      </div>
    </div>
  )
}
