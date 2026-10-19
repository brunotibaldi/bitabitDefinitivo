'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWRInfinite from 'swr/infinite'
import { ArrowDown, CalendarDays, Loader2, PartyPopper } from 'lucide-react'
import { loadFeedPage } from '@/app/actions/game'
import type { PublicQuestion } from '@/lib/game/queries'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { QuestionCard } from './question-card'
import { useStats } from './stats-provider'

const PAGE_SIZE = 8

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-[calc(100dvh-8.5rem)] snap-start snap-always items-center justify-center px-4 py-6 md:min-h-[calc(100dvh-3.5rem)]">
      <div className="w-full max-w-xl">{children}</div>
    </section>
  )
}

export function Feed({ seed, firstPage }: { seed: string; firstPage: PublicQuestion[] }) {
  const { dailyDone } = useStats()
  const [showDailyPrompt] = useState(!dailyDone)

  const { data, size, setSize, isValidating } = useSWRInfinite(
    (index, prev: PublicQuestion[] | null) => (prev && prev.length < PAGE_SIZE ? null : ['feed', seed, index]),
    ([, s, index]) => loadFeedPage(s as string, index as number),
    {
      fallbackData: [firstPage],
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  )

  const items = data?.flat() ?? []
  const seen = new Set<number>()
  const unique = items.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)))
  const reachedEnd = !!data && data[data.length - 1].length < PAGE_SIZE

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (reachedEnd || isValidating) return
    if (el.scrollTop + el.clientHeight * 3 >= el.scrollHeight) setSize(size + 1)
  }

  return (
    <div
      onScroll={onScroll}
      className="no-scrollbar h-[calc(100dvh-8.5rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain md:h-[calc(100dvh-3.5rem)]"
    >
      {showDailyPrompt && (
        <Slide>
          <div className="flex flex-col items-start gap-5 rounded-3xl border border-streak/30 bg-streak/10 p-7">
            <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-streak">
              <CalendarDays className="size-4" aria-hidden="true" />
              Pregunta del día
            </span>
            <h2 className="text-balance text-2xl font-semibold leading-snug">
              La misma pregunta para toda la carrera. Respondela y debatila con los demás.
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Vale 30 puntos y asegura tu racha de hoy con una sola respuesta.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/hoy"
                className={cn(buttonVariants({ size: 'lg' }), 'rounded-full bg-streak px-4 text-streak-foreground hover:bg-streak/90')}
              >
                Ir a la del día
              </Link>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowDown className="size-4" aria-hidden="true" />o deslizá para el scroll
              </span>
            </div>
          </div>
        </Slide>
      )}

      {unique.map((q) => (
        <Slide key={q.id}>
          <QuestionCard question={q} />
        </Slide>
      ))}

      <Slide>
        {reachedEnd ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <PartyPopper className="size-10 text-primary" aria-hidden="true" />
            <h2 className="text-balance text-2xl font-semibold">¡Respondiste todo lo disponible!</h2>
            <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
              Sumamos preguntas nuevas a medida que procesamos más exámenes. Mientras tanto, mirá cómo vas en el ranking.
            </p>
            <Link href="/ranking" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-full px-4')}>
              Ver ranking
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando más preguntas" />
          </div>
        )}
      </Slide>
    </div>
  )
}
