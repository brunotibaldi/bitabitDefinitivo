'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { saveSubjects } from '@/app/actions/game'
import { termInYear } from '@/lib/game/plan'
import { sfx } from '@/lib/sfx'
import { shake } from '@/lib/shake'
import { cn } from '@/lib/utils'
import { subjectColor } from './user-avatar'

type Subject = {
  id: number
  name: string
  shortName: string
  color: string
  year: number | null
  term: number | null
  count: number
}

const YEAR_COLORS = ['bg-game-red', 'bg-game-blue', 'bg-game-yellow', 'bg-game-green', 'bg-primary'] as const
const YEAR_NAMES = ['1ER AÑO', '2DO AÑO', '3ER AÑO', '4TO AÑO', '5TO AÑO']

function splitByTerm(list: Subject[], year: number) {
  if (!year) return [{ label: 'OPTATIVAS DEL PLAN', list }]
  const blocks = [1, 2].map((t) => ({
    label: `${t}º CUATRIMESTRE`,
    list: list.filter((s) => (termInYear(s.term) ?? 1) === t),
  }))
  return blocks.filter((b) => b.list.length)
}

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

  const groups = useMemo(() => {
    const map = new Map<number, Subject[]>()
    for (const s of subjects) {
      const y = s.year && s.year >= 1 && s.year <= 5 ? s.year : 0
      map.set(y, [...(map.get(y) ?? []), s])
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a || 99) - (b || 99))
      .map(([year, list]) => ({
        year,
        list: list.sort((a, b) => (a.term ?? 9) - (b.term ?? 9) || a.name.localeCompare(b.name)),
      }))
  }, [subjects])

  const [open, setOpen] = useState<Set<number>>(() => {
    const withSelection = groups.filter((g) => g.list.some((s) => initial.includes(s.id))).map((g) => g.year)
    return new Set(withSelection.length ? withSelection : groups.slice(0, 1).map((g) => g.year))
  })

  function toggle(id: number) {
    setSaved(false)
    sfx.tap()
    shake('tap')
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleYear(list: Subject[]) {
    setSaved(false)
    sfx.select()
    shake('soft')
    setSelected((s) => {
      const next = new Set(s)
      const all = list.every((x) => next.has(x.id))
      for (const x of list) {
        if (all) next.delete(x.id)
        else next.add(x.id)
      }
      return next
    })
  }

  function toggleOpen(year: number) {
    sfx.tap()
    setOpen((o) => {
      const next = new Set(o)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  function save() {
    const ids = selected.size ? [...selected] : subjects.map((s) => s.id)
    if (!selected.size) setSelected(new Set(ids))
    startTransition(async () => {
      await saveSubjects(ids)
      sfx.coin()
      shake('soft')
      setSaved(true)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  const total = subjects.filter((s) => selected.size === 0 || selected.has(s.id)).reduce((a, s) => a + s.count, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {groups.map(({ year, list }, gi) => {
          const isOpen = open.has(year)
          const picked = list.filter((s) => selected.has(s.id)).length
          const all = picked === list.length
          const color = year ? YEAR_COLORS[year - 1] : 'bg-secondary'
          const panelId = `year-panel-${year}`
          return (
            <section key={year} className="pixel-box bg-card" aria-labelledby={`year-btn-${year}`}>
              <h3 className="flex items-stretch">
                <button
                  id={`year-btn-${year}`}
                  type="button"
                  onClick={() => toggleOpen(year)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={cn('flex flex-1 items-center gap-3 px-3 py-3 text-left text-ink sm:px-4', color, isOpen && 'border-b-3 border-ink')}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center border-3 border-ink bg-ink font-pixel text-xs text-foreground">
                    {year || '?'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-pixel text-[11px] sm:text-xs">{year ? YEAR_NAMES[year - 1] : 'ELECTIVAS'}</span>
                    <span className="flex items-center gap-1" aria-hidden="true">
                      {list.map((s) => (
                        <span key={s.id} className={cn('h-2 w-3 border-2 border-ink', selected.has(s.id) ? 'bg-ink' : 'bg-ink/20')} />
                      ))}
                    </span>
                  </span>
                  <span className="font-pixel text-[9px] tabular-nums">
                    {picked}/{list.length}
                    <span className="sr-only"> materias elegidas</span>
                  </span>
                  <ChevronDown className={cn('size-5 shrink-0 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                </button>
              </h3>

              {isOpen && (
                <div id={panelId} className="flex flex-col gap-2 p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => toggleYear(list)}
                    className="self-end font-pixel text-[8px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {all ? 'QUITAR TODAS' : 'ELEGIR TODAS'}
                  </button>
                  {splitByTerm(list, year).map((block) => (
                  <div key={block.label} className="flex flex-col gap-2">
                  <p className="flex items-center gap-2 font-pixel text-[8px] text-muted-foreground">
                    <span className={cn('size-2 border-2 border-ink', color)} aria-hidden="true" />
                    {block.label}
                    <span className="h-0.5 flex-1 bg-ink" aria-hidden="true" />
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {block.list.map((s, i) => {
                      const on = selected.has(s.id)
                      return (
                        <li key={s.id} className="animate-pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                          <button
                            type="button"
                            onClick={() => toggle(s.id)}
                            aria-pressed={on}
                            className={cn(
                              'pixel-btn flex w-full items-center gap-3 px-3 py-2.5 text-left',
                              on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                            )}
                          >
                            <span
                              className="size-3 shrink-0 border-2 border-ink"
                              style={{ backgroundColor: subjectColor(s.color) }}
                              aria-hidden="true"
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-bold" title={s.name}>
                                {s.name}
                              </span>
                              <span className={cn('font-pixel text-[8px]', on ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                {s.count} PREG
                              </span>
                            </span>
                            <span
                              className={cn(
                                'flex size-6 shrink-0 items-center justify-center border-2 border-ink',
                                on ? 'bg-ink text-primary' : 'bg-ink/20',
                              )}
                              aria-hidden="true"
                            >
                              {on && <Check className="size-4" strokeWidth={4} />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="pixel-box sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 bg-card p-3 lg:bottom-4">
        <p className="flex flex-col gap-1">
          <span className="font-pixel text-[9px]">
            {selected.size === 0 ? 'TODAS LAS MATERIAS' : `${selected.size} MATERIAS`}
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">{total}</span> preguntas en juego
          </span>
        </p>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="pixel-btn flex items-center gap-2 bg-primary px-4 py-3 font-pixel text-[10px] text-primary-foreground disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {saved && !redirectTo ? 'GUARDADO' : redirectTo ? 'PRESS START' : 'GUARDAR'}
        </button>
      </div>
    </div>
  )
}
