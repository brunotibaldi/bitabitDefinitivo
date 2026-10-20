'use client'

import { useRef, useState, useTransition } from 'react'
import { Flag, X } from 'lucide-react'
import { reportQuestion } from '@/app/actions/game'
import { REPORT_CATEGORIES } from '@/lib/game/question-input'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

export function ReportButton({ questionId }: { questionId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0].value)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function open() {
    sfx.tap()
    setError(null)
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await reportQuestion({ questionId, category, message })
      if (!res.ok) {
        setError('No pudimos enviar el reporte. Probá de nuevo.')
        return
      }
      sfx.send()
      setSent(true)
      close()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={sent}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-game-red disabled:text-game-green"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        {sent ? 'Reporte enviado' : 'Reportar error'}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`report-title-${questionId}`}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(92vw,28rem)] bg-transparent p-0 text-foreground backdrop:bg-ink/80"
      >
        <form onSubmit={submit} className="pixel-box flex animate-pop-in flex-col gap-4 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`report-title-${questionId}`} className="font-pixel text-xs leading-relaxed text-game-red">
              REPORTAR ERROR
            </h2>
            <button type="button" onClick={close} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-muted-foreground">{'¿Qué está mal?'}</legend>
            {REPORT_CATEGORIES.map((c) => (
              <label
                key={c.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 border-3 border-ink px-3 py-2.5 text-sm transition-colors',
                  category === c.value ? 'bg-game-red text-ink' : 'bg-secondary hover:bg-accent',
                )}
              >
                <input
                  type="radio"
                  name={`category-${questionId}`}
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => {
                    sfx.tap()
                    setCategory(c.value)
                  }}
                  className="sr-only"
                />
                <span
                  className={cn('size-3 border-2 border-ink', category === c.value ? 'bg-ink' : 'bg-transparent')}
                  aria-hidden="true"
                />
                {c.label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor={`report-msg-${questionId}`} className="text-sm text-muted-foreground">
              Contanos brevemente (opcional)
            </label>
            <textarea
              id={`report-msg-${questionId}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej: la opción B también es correcta porque…"
              className="resize-none border-3 border-ink bg-ink/60 px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <span className="self-end text-xs tabular-nums text-muted-foreground">{message.length}/500</span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-game-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="pixel-btn bg-game-red py-3 font-pixel text-xs text-ink disabled:opacity-60"
          >
            {isPending ? 'ENVIANDO…' : 'ENVIAR AL ADMIN'}
          </button>
        </form>
      </dialog>
    </>
  )
}
