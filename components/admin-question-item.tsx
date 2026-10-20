'use client'

import { useState, useTransition } from 'react'
import { Check, MessageSquareWarning, Pencil, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { resolveReports, setQuestionStatus, updateQuestion } from '@/app/actions/admin'
import type { QuestionContext, QuestionType } from '@/lib/db/schema'
import { REPORT_CATEGORIES, TYPE_META } from '@/lib/game/question-input'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'
import { MathText } from './math-text'
import { QuestionBuilder } from './question-builder'

type Report = { category: string; message: string | null; createdAt: string; username: string | null }

type Q = {
  id: number
  subjectId: number
  subjectShort: string
  type: QuestionType
  prompt: string
  options: string[]
  correctIndex: number
  answerOrder: number[] | null
  context: QuestionContext | null
  explanation: string
  difficulty: number
  topic: string | null
  upvotes: number
  downvotes: number
  authorUsername: string | null
  createdAt: string
  reports: Report[]
}

const QUADS = ['bg-game-red', 'bg-game-blue', 'bg-game-yellow', 'bg-game-green']

export function AdminQuestionItem({
  question: q,
  mode,
  subjects,
}: {
  question: Q
  mode: 'pending' | 'reported'
  subjects: { id: number; name: string; shortName: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [gone, setGone] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function act(fn: () => Promise<unknown>, label: string, good = true) {
    startTransition(async () => {
      await fn()
      if (good) sfx.coin()
      else sfx.wrong()
      setGone(label)
    })
  }

  if (gone) {
    return (
      <div className="animate-pop-in border-3 border-ink bg-secondary px-4 py-3 font-pixel text-[9px] text-muted-foreground">
        #{q.id} · {gone}
      </div>
    )
  }

  const correctSet = q.type === 'order' ? null : q.correctIndex

  return (
    <article className="pixel-box flex flex-col gap-4 bg-card p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="border-2 border-ink bg-game-blue px-1.5 py-0.5 font-pixel text-[8px] text-ink">{TYPE_META[q.type].short}</span>
        <span className="font-bold">{q.subjectShort}</span>
        <span>#{q.id}</span>
        {q.authorUsername && <span>por @{q.authorUsername}</span>}
        <span className="ml-auto flex items-center gap-2 tabular-nums">
          <ThumbsUp className="size-3.5 text-game-green" aria-label="positivos" />
          {q.upvotes}
          <ThumbsDown className="size-3.5 text-game-red" aria-label="negativos" />
          {q.downvotes}
        </span>
      </header>

      {editing ? (
        <QuestionBuilder
          subjects={subjects}
          submitLabel="GUARDAR CAMBIOS"
          initial={{
            subjectId: q.subjectId,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correctIndex,
            answerOrder: q.answerOrder ?? undefined,
            context: q.context ?? undefined,
            explanation: q.explanation,
            difficulty: q.difficulty,
            topic: q.topic ?? undefined,
          }}
          onSubmit={async (input) => {
            const res = await updateQuestion(q.id, input)
            if (res.ok) setTimeout(() => setEditing(false), 900)
            return res
          }}
        />
      ) : (
        <>
          <p className="text-base font-bold leading-snug">
            <MathText text={q.prompt} />
          </p>
          {q.context?.term && <p className="text-sm">Término: <MathText text={q.context.term} /></p>}
          {q.context?.code && (
            <pre className="overflow-x-auto border-3 border-ink bg-ink p-3 text-xs text-game-green">{q.context.code}</pre>
          )}
          {q.context?.lines && (
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {q.context.lines.map((l, i) => (
                <li key={i}>
                  <MathText text={l} />
                </li>
              ))}
            </ol>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {(q.type === 'order' && q.answerOrder ? q.answerOrder : q.options.map((_, i) => i)).map((optIdx, pos) => (
              <li
                key={optIdx}
                className={cn(
                  'flex items-center gap-2 border-3 border-ink px-3 py-2 text-sm font-bold text-ink',
                  QUADS[pos % 4],
                  correctSet !== null && optIdx !== correctSet && 'opacity-40',
                )}
              >
                {q.type === 'order' ? (
                  <span className="font-pixel text-[9px]">{pos + 1}</span>
                ) : optIdx === correctSet ? (
                  <Check className="size-4 shrink-0" strokeWidth={4} aria-label="correcta" />
                ) : null}
                <MathText text={q.options[optIdx]} />
              </li>
            ))}
          </ul>
          <p className="border-l-4 border-primary bg-ink/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
            <MathText text={q.explanation} />
          </p>
        </>
      )}

      {mode === 'reported' && q.reports.length > 0 && (
        <section className="flex flex-col gap-2 border-3 border-game-red/70 bg-game-red/10 p-3" aria-label="Reportes">
          <h3 className="flex items-center gap-2 font-pixel text-[9px] text-game-red">
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            {q.reports.length} {q.reports.length === 1 ? 'REPORTE' : 'REPORTES'}
          </h3>
          <ul className="flex flex-col gap-2">
            {q.reports.map((r, i) => (
              <li key={i} className="flex flex-col gap-1 border-2 border-ink bg-card px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">@{r.username ?? 'anónimo'}</span>
                  <span className="border border-game-red px-1 text-game-red">
                    {REPORT_CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}
                  </span>
                  <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString('es-AR')}</time>
                </span>
                {r.message ? <p className="text-pretty leading-relaxed">{r.message}</p> : <p className="italic text-muted-foreground">Sin mensaje</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          disabled={isPending}
          className="pixel-btn flex items-center gap-2 bg-game-blue px-3 py-2.5 font-pixel text-[9px] text-ink"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {editing ? 'CANCELAR' : 'EDITAR'}
        </button>
        {mode === 'pending' ? (
          <>
            <button
              type="button"
              onClick={() => act(() => setQuestionStatus(q.id, 'approved'), 'APROBADA')}
              disabled={isPending}
              className="pixel-btn flex items-center gap-2 bg-game-green px-3 py-2.5 font-pixel text-[9px] text-ink"
            >
              <Check className="size-3.5" aria-hidden="true" /> APROBAR
            </button>
            <button
              type="button"
              onClick={() => act(() => setQuestionStatus(q.id, 'rejected'), 'RECHAZADA', false)}
              disabled={isPending}
              className="pixel-btn flex items-center gap-2 bg-game-red px-3 py-2.5 font-pixel text-[9px] text-ink"
            >
              <X className="size-3.5" aria-hidden="true" /> RECHAZAR
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => act(() => resolveReports(q.id), 'REPORTES RESUELTOS')}
              disabled={isPending}
              className="pixel-btn flex items-center gap-2 bg-game-green px-3 py-2.5 font-pixel text-[9px] text-ink"
            >
              <Check className="size-3.5" aria-hidden="true" /> RESUELTO
            </button>
            <button
              type="button"
              onClick={() => act(() => setQuestionStatus(q.id, 'rejected'), 'QUITADA DEL JUEGO', false)}
              disabled={isPending}
              className="pixel-btn flex items-center gap-2 bg-game-red px-3 py-2.5 font-pixel text-[9px] text-ink"
            >
              <X className="size-3.5" aria-hidden="true" /> QUITAR
            </button>
          </>
        )}
      </div>
    </article>
  )
}
