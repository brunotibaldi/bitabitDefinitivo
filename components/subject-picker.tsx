'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { saveSubjects } from '@/app/actions/game'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { subjectColor } from './user-avatar'

type Subject = { id: number; name: string; shortName: string; color: string; count: number }

export function SubjectPicker({
  subjects,
  initial,
  redirectTo,
}: {
  subjects: Subject[]
  initial: number[]
  redirectTo?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(new Set(initial))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle(id: number) {
    setSaved(false)
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    startTransition(async () => {
      await saveSubjects([...selected])
      setSaved(true)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  const total = subjects.filter((s) => selected.size === 0 || selected.has(s.id)).reduce((a, s) => a + s.count, 0)

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {subjects.map((s) => {
          const on = selected.has(s.id)
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-all hover:border-foreground/20',
                  on && 'border-primary/60 bg-primary/10',
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: subjectColor(s.color) }} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.count} preguntas</span>
                </span>
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border',
                    on && 'border-primary bg-primary text-primary-foreground',
                  )}
                  aria-hidden="true"
                >
                  {on && <Check className="size-4" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-4 flex flex-col items-stretch gap-3 rounded-2xl border bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size === 0 ? 'Sin filtro: todas las materias' : `${selected.size} materias`}
          {' · '}
          <span className="font-mono text-foreground">{total}</span> preguntas
        </p>
        <Button onClick={save} disabled={isPending} className="h-11 rounded-xl px-6 font-semibold">
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {saved && !redirectTo ? 'Guardado' : redirectTo ? 'Empezar' : 'Guardar materias'}
        </Button>
      </div>
    </div>
  )
}
