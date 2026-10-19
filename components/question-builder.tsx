'use client'

import { useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Check, Minus, Plus } from 'lucide-react'
import { QUESTION_TYPES, type QuestionType } from '@/lib/db/schema'
import { TYPE_META, type QuestionInput } from '@/lib/game/question-input'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

const QUADS = ['bg-game-red', 'bg-game-blue', 'bg-game-yellow', 'bg-game-green']
const TF = ['Verdadero', 'Falso']

type Subject = { id: number; name: string; shortName: string }

const field =
  'w-full border-3 border-ink bg-ink/60 px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:border-primary'
const label = 'font-pixel text-[9px] leading-relaxed text-muted-foreground'

function defaultsFor(type: QuestionType, prev: string[]) {
  if (type === 'true_false') return TF
  if (type === 'order') return prev.length >= 3 ? prev.slice(0, 6) : ['', '', '']
  const four = [...prev.filter((o) => !TF.includes(o)), '', '', '', ''].slice(0, 4)
  return four
}

export function QuestionBuilder({
  subjects,
  initial,
  submitLabel = 'ENVIAR A REVISIÓN',
  onSubmit,
}: {
  subjects: Subject[]
  initial?: Partial<QuestionInput>
  submitLabel?: string
  onSubmit: (input: QuestionInput) => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? 'mcq')
  const [subjectId, setSubjectId] = useState<number>(initial?.subjectId ?? subjects[0]?.id ?? 0)
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [options, setOptions] = useState<string[]>(
    initial?.options
      ? initial.type === 'order' && initial.answerOrder
        ? initial.answerOrder.map((i) => initial.options![i])
        : initial.options
      : ['', '', '', ''],
  )
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0)
  const [term, setTerm] = useState(initial?.context?.term ?? '')
  const [code, setCode] = useState(initial?.context?.code ?? '')
  const [lines, setLines] = useState((initial?.context?.lines ?? []).join('\n'))
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1)
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function changeType(t: QuestionType) {
    sfx.tap()
    setType(t)
    setOptions((prev) => defaultsFor(t, prev))
    setCorrectIndex(0)
  }

  function setOption(i: number, v: string) {
    setOptions((o) => o.map((x, j) => (j === i ? v : x)))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= options.length) return
    sfx.tap()
    setOptions((o) => {
      const n = [...o]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  function reset() {
    setPrompt('')
    setOptions(defaultsFor(type, []))
    setCorrectIndex(0)
    setTerm('')
    setCode('')
    setLines('')
    setExplanation('')
    setTopic('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input: QuestionInput = {
      subjectId,
      type,
      prompt,
      options: options.map((o) => o.trim()),
      correctIndex: type === 'order' ? 0 : correctIndex,
      answerOrder: type === 'order' ? options.map((_, i) => i) : undefined,
      context:
        type === 'definition'
          ? { term }
          : type === 'code_output'
            ? { code }
            : type === 'proof_gap'
              ? { lines: lines.split('\n').map((l) => l.trim()).filter(Boolean) }
              : undefined,
      explanation,
      difficulty,
      topic: topic || undefined,
    }
    startTransition(async () => {
      const res = await onSubmit(input)
      if (!res.ok) {
        sfx.wrong()
        setError(res.error)
        return
      }
      sfx.combo()
      setDone(true)
      if (!initial) reset()
      setTimeout(() => setDone(false), 2600)
    })
  }

  const isOrder = type === 'order'
  const isTF = type === 'true_false'

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className={cn(label, 'mb-3')}>1 · TIPO DE PREGUNTA</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUESTION_TYPES.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              aria-pressed={type === t}
              className={cn(
                'pixel-btn flex flex-col items-start gap-1 px-3 py-2.5 text-left',
                type === t ? cn(QUADS[i % 4], 'text-ink') : 'bg-secondary text-foreground',
              )}
            >
              <span className="font-pixel text-[8px]">{TYPE_META[t].short}</span>
              <span className="text-xs font-bold leading-tight">{TYPE_META[t].label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{TYPE_META[type].hint}</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="qb-subject" className={label}>
            MATERIA
          </label>
          <select id="qb-subject" value={subjectId} onChange={(e) => setSubjectId(Number(e.target.value))} className={field}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="qb-topic" className={label}>
            TEMA (OPCIONAL)
          </label>
          <input id="qb-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} placeholder="Ej: Grafos" className={field} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="qb-prompt" className={label}>
          2 · ENUNCIADO
        </label>
        <textarea
          id="qb-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={400}
          rows={3}
          required
          placeholder={
            type === 'fill_blank'
              ? 'Un árbol con n nodos tiene ___ aristas.'
              : type === 'intruder'
                ? '¿Cuál de estos NO es un algoritmo de ordenamiento estable?'
                : 'Escribí la pregunta. Podés usar $LaTeX$ entre signos $.'
          }
          className={cn(field, 'resize-none')}
        />
      </div>

      {type === 'definition' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="qb-term" className={label}>
            TÉRMINO
          </label>
          <input id="qb-term" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={120} placeholder="Ej: Grafo bipartito" className={field} />
        </div>
      )}
      {type === 'code_output' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="qb-code" className={label}>
            CÓDIGO
          </label>
          <textarea
            id="qb-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={800}
            rows={6}
            spellCheck={false}
            placeholder={'x = [1, 2, 3]\nprint(x[-1])'}
            className={cn(field, 'resize-y font-mono text-game-green')}
          />
        </div>
      )}
      {type === 'proof_gap' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="qb-lines" className={label}>
            PASOS (UNO POR LÍNEA, ??? EN EL QUE FALTA)
          </label>
          <textarea
            id="qb-lines"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            rows={5}
            placeholder={'Supongamos que √2 = p/q irreducible\n2q² = p²\n???\nEntonces q también es par: absurdo'}
            className={cn(field, 'resize-y')}
          />
        </div>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className={cn(label, 'mb-3')}>
          3 · {isOrder ? 'PASOS EN EL ORDEN CORRECTO' : 'OPCIONES — TOCÁ ✓ EN LA CORRECTA'}
        </legend>
        <div className={cn('grid gap-3', isOrder ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {options.map((opt, i) => {
            const correct = !isOrder && correctIndex === i
            const color = isTF ? (i === 0 ? QUADS[3] : QUADS[0]) : QUADS[i % 4]
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 border-3 border-ink p-2 text-ink transition-transform',
                  color,
                  correct && 'outline-4 outline-offset-2 outline-foreground',
                  !isOrder && !correct && 'opacity-80',
                )}
              >
                {isOrder ? (
                  <span className="flex size-8 shrink-0 items-center justify-center border-2 border-ink bg-ink/20 font-pixel text-[10px]">
                    {i + 1}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sfx.select()
                      setCorrectIndex(i)
                    }}
                    aria-pressed={correct}
                    aria-label={`Marcar opción ${i + 1} como correcta`}
                    className={cn('flex size-8 shrink-0 items-center justify-center border-2 border-ink', correct ? 'bg-ink text-foreground' : 'bg-ink/15')}
                  >
                    {correct ? <Check className="size-4" strokeWidth={4} /> : <span className="font-pixel text-[9px]">{'ABCD'[i]}</span>}
                  </button>
                )}
                {isTF ? (
                  <span className="flex-1 px-1 font-pixel text-[10px]">{opt}</span>
                ) : (
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={200}
                    required
                    aria-label={isOrder ? `Paso ${i + 1}` : `Opción ${i + 1}`}
                    placeholder={isOrder ? `Paso ${i + 1}` : `Opción ${'ABCD'[i]}`}
                    className="min-w-0 flex-1 border-2 border-ink/30 bg-ink/10 px-2 py-1.5 text-sm font-bold outline-none placeholder:text-ink/50 focus:border-ink"
                  />
                )}
                {isOrder && (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="border-2 border-ink bg-ink/15 p-1" aria-label="Subir paso">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="border-2 border-ink bg-ink/15 p-1" aria-label="Bajar paso">
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {isOrder && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => options.length < 6 && setOptions((o) => [...o, ''])}
              disabled={options.length >= 6}
              className="pixel-btn flex items-center gap-1.5 bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              <Plus className="size-3.5" /> Paso
            </button>
            <button
              type="button"
              onClick={() => options.length > 3 && setOptions((o) => o.slice(0, -1))}
              disabled={options.length <= 3}
              className="pixel-btn flex items-center gap-1.5 bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              <Minus className="size-3.5" /> Paso
            </button>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="qb-expl" className={label}>
          4 · EXPLICACIÓN
        </label>
        <textarea
          id="qb-expl"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          maxLength={500}
          rows={2}
          required
          placeholder="¿Por qué es esa la respuesta? Se muestra después de responder."
          className={cn(field, 'resize-none')}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className={cn(label, 'mb-3')}>DIFICULTAD</legend>
        <div className="flex gap-2">
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                sfx.tap()
                setDifficulty(d)
              }}
              aria-pressed={difficulty === d}
              className={cn(
                'pixel-btn flex-1 py-2.5 font-pixel text-[9px]',
                difficulty === d ? ['bg-game-green', 'bg-game-yellow', 'bg-game-red'][d - 1] + ' text-ink' : 'bg-secondary',
              )}
            >
              {['FÁCIL', 'MEDIA', 'DIFÍCIL'][d - 1]}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="border-3 border-ink bg-game-red px-3 py-2 text-sm font-bold text-ink">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="animate-pop-in border-3 border-ink bg-game-green px-3 py-2 font-pixel text-[10px] leading-relaxed text-ink">
          {initial ? '¡GUARDADO!' : '¡ENVIADA! LA VAS A VER CUANDO EL ADMIN LA APRUEBE.'}
        </p>
      )}

      <button type="submit" disabled={isPending} className="pixel-btn bg-primary py-4 font-pixel text-xs text-primary-foreground disabled:opacity-60">
        {isPending ? 'GUARDANDO…' : submitLabel}
      </button>
    </form>
  )
}
