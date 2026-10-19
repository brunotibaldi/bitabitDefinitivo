'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWRInfinite from 'swr/infinite'
import { ChevronsDown, Plus, Trophy } from 'lucide-react'
import { loadFeedPage } from '@/app/actions/game'
import type { PublicQuestion } from '@/lib/game/queries'
import { sfx } from '@/lib/sfx'
import { QuestionCard } from './question-card'
import { useStats } from './stats-provider'

const PAGE_SIZE = 8
const VIEW_H = 'h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-4rem)]'
const SLIDE_H = 'min-h-[calc(100dvh-9.5rem)] lg:min-h-[calc(100dvh-4rem)]'

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <section className={`flex snap-start snap-always items-center justify-center px-4 py-6 ${SLIDE_H}`}>
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
    <div onScroll={onScroll} className={`no-scrollbar snap-y snap-mandatory overflow-y-auto overscroll-contain ${VIEW_H}`}>
      {showDailyPrompt && (
        <Slide>
          <div className="pixel-box flex animate-pop-in flex-col items-center gap-6 bg-card px-6 py-10 text-center">
            <span className="animate-blink font-pixel text-[10px] text-streak">{'★ NUEVO NIVEL ★'}</span>
            <h2 className="text-balance font-pixel text-lg leading-relaxed text-primary text-shadow-pixel sm:text-xl">
              PREGUNTA DEL DÍA
            </h2>
            <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
              La misma para toda la carrera. Vale el doble de puntos, asegura tu racha y después se debate.
            </p>
            <Link
              href="/hoy"
              onClick={() => sfx.coin()}
              className="pixel-btn animate-bob bg-game-red px-6 py-4 font-pixel text-xs text-ink"
            >
              {'▶ JUGAR AHORA'}
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChevronsDown className="size-4 animate-bounce" aria-hidden="true" />o deslizá para el modo libre
            </span>
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
          <div className="pixel-box flex flex-col items-center gap-5 bg-card px-6 py-10 text-center">
            <span className="font-pixel text-lg leading-relaxed text-game-yellow text-shadow-pixel">¡NIVEL COMPLETO!</span>
            <p className="max-w-sm text-pretty leading-relaxed text-muted-foreground">
              Respondiste todas las preguntas disponibles. Creá una nueva para la comunidad o mirá cómo vas.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/crear" className="pixel-btn flex items-center gap-2 bg-primary px-4 py-3 font-pixel text-[10px] text-primary-foreground">
                <Plus className="size-4" aria-hidden="true" />
                CREAR
              </Link>
              <Link href="/ranking" className="pixel-btn flex items-center gap-2 bg-game-green px-4 py-3 font-pixel text-[10px] text-ink">
                <Trophy className="size-4" aria-hidden="true" />
                RANKING
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4" role="status">
            <div className="flex gap-2" aria-hidden="true">
              {['bg-game-red', 'bg-game-blue', 'bg-game-yellow', 'bg-game-green'].map((c, i) => (
                <span key={c} className={`size-4 animate-bob border-2 border-ink ${c}`} style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <span className="font-pixel text-[10px] text-muted-foreground">CARGANDO…</span>
          </div>
        )}
      </Slide>
    </div>
  )
}
