'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

export type BoardRow = {
  userId: string
  name: string
  username: string
  points: number
  streak: number
}

const TOP = 10
const CHAR_MS = 22
const BOOT_MS = 520
const ROW_PAUSE = 5
const NAME_MAX = 12
const SCORE_DIGITS = 6
const TITLE = 'HI SCORE'
const ORDINALS = ['1RO', '2DO', '3RO', '4TO', '5TO', '6TO', '7MO', '8VO', '9NO', '10MO']
const RANK_COLORS = ['text-game-yellow', 'text-foreground', 'text-game-red', 'text-game-green', 'text-game-blue']

type Line = {
  row: BoardRow
  position: number
  me: boolean
  rank: string
  name: string
  score: string
  start: number
}

export function ArcadeBoard({ rows, meId }: { rows: BoardRow[]; meId: string }) {
  const { lines, meLine, total } = useMemo(() => {
    const ranked = rows.map((row, i) => ({ row, position: i + 1, me: row.userId === meId }))
    const visible = ranked.slice(0, TOP)
    const mine = ranked.find((r) => r.me && r.position > TOP)
    let cursor = TITLE.length + ROW_PAUSE
    const toLine = (r: (typeof ranked)[number]): Line => {
      const name = r.row.name.toUpperCase().slice(0, NAME_MAX)
      const score = String(Math.min(r.row.points, 10 ** SCORE_DIGITS - 1)).padStart(SCORE_DIGITS, '0')
      const line = { ...r, rank: ORDINALS[r.position - 1] ?? `#${r.position}`, name, score, start: cursor }
      cursor += name.length + score.length + ROW_PAUSE
      return line
    }
    const lines = visible.map(toLine)
    const meLine = mine ? toLine(mine) : null
    return { lines, meLine, total: cursor }
  }, [rows, meId])

  const [typed, setTyped] = useState(0)
  const [booted, setBooted] = useState(false)
  const done = typed >= total

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBooted(true)
      setTyped(Number.POSITIVE_INFINITY)
      return
    }
    const boot = setTimeout(() => setBooted(true), BOOT_MS)
    return () => clearTimeout(boot)
  }, [])

  useEffect(() => {
    if (!booted || done) return
    const id = setInterval(() => {
      setTyped((t) => {
        const next = t + 1
        if (next % 2 === 0) sfx.type(next % 5)
        return next
      })
    }, CHAR_MS)
    return () => clearInterval(id)
  }, [booted, done])

  const skip = () => {
    if (!done) setTyped(Number.POSITIVE_INFINITY)
  }

  return (
    <section
      aria-label="Tabla de puntajes"
      onClick={skip}
      className={cn(
        'arcade-screen relative flex flex-col gap-6 overflow-hidden bg-ink px-4 py-7 font-pixel sm:px-8 sm:py-9',
        booted ? 'animate-crt-on' : 'opacity-0',
      )}
    >
      <h2 className="text-center text-xl leading-none text-game-yellow text-crt sm:text-2xl" aria-label={TITLE}>
        <Typed text={TITLE} visible={typed} start={0} />
      </h2>

      <div
        aria-hidden="true"
        className="arcade-grid text-[8px] leading-none text-game-blue text-crt sm:text-[10px]"
      >
        <span />
        <span>PUESTO</span>
        <span>NOMBRE</span>
        <span className="text-right">PUNTOS</span>
        <span className="text-right">RACHA</span>
      </div>

      {lines.length === 0 ? (
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">{'SIN JUGADORES… TODAVÍA'}</p>
      ) : (
        <ol className="flex flex-col gap-4 sm:gap-5">
          {lines.map((l) => (
            <BoardLine key={l.row.userId} line={l} typed={typed} />
          ))}
        </ol>
      )}

      {meLine && (
        <div className="flex flex-col gap-4 border-t-2 border-dashed border-foreground/20 pt-5">
          <span aria-hidden="true" className="text-center text-[8px] text-muted-foreground">
            {'· · · · ·'}
          </span>
          <ol>
            <BoardLine line={meLine} typed={typed} />
          </ol>
        </div>
      )}

      <footer
        className={cn(
          'flex flex-col items-center gap-5 pt-2 transition-opacity duration-300',
          done ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="text-center text-[10px] leading-relaxed text-game-green text-crt sm:text-xs">
          {'¡GRACIAS POR JUGAR!'}
        </p>
        <Link
          href="/"
          tabIndex={done ? 0 : -1}
          className="pixel-btn animate-bob bg-game-yellow px-4 py-3 text-[10px] text-ink"
        >
          {'SEGUIR JUGANDO'}
        </Link>
      </footer>

      {!done && booted && (
        <span className="absolute right-3 bottom-3 animate-blink text-[7px] text-muted-foreground">
          {'TOCÁ PARA SALTAR'}
        </span>
      )}
    </section>
  )
}

function BoardLine({ line, typed }: { line: Line; typed: number }) {
  const { row, position, me, rank, name, score, start } = line
  const started = typed >= start
  const scoreStart = start + name.length
  const finished = typed >= scoreStart + score.length
  const rankColor = me ? 'text-game-yellow' : RANK_COLORS[(position - 1) % RANK_COLORS.length]
  const leadingZeros = score.length - String(Number(score)).length

  return (
    <li
      aria-label={`${position}. ${row.name}${me ? ' (vos)' : ''}, ${row.points} puntos${row.streak > 0 ? `, racha de ${row.streak} días` : ''}`}
      className={cn('arcade-grid text-[10px] leading-none text-crt sm:text-sm', me ? 'text-game-yellow' : 'text-foreground')}
    >
      <span aria-hidden="true" className="flex justify-end">
        {me && started && <span className="arcade-cursor animate-blink" />}
      </span>
      <span aria-hidden="true" className={cn(rankColor, !started && 'invisible')}>
        {rank}
      </span>
      <span aria-hidden="true" className="truncate">
        <Typed text={name} visible={typed} start={start} />
      </span>
      <span aria-hidden="true" className="text-right tabular-nums">
        <Typed text={score} visible={typed} start={scoreStart} dimFirst={leadingZeros} />
      </span>
      <span aria-hidden="true" className={cn('text-right text-game-red', !finished && 'invisible')}>
        {row.streak > 0 ? row.streak : '-'}
      </span>
    </li>
  )
}

function Typed({ text, visible, start, dimFirst = 0 }: { text: string; visible: number; start: number; dimFirst?: number }) {
  const count = Math.max(0, Math.min(text.length, visible - start))
  const typing = count > 0 && count < text.length
  const shown = text.slice(0, count)
  return (
    <span aria-hidden="true">
      {dimFirst > 0 ? (
        <>
          <span className="opacity-30">{shown.slice(0, dimFirst)}</span>
          {shown.slice(dimFirst)}
        </>
      ) : (
        shown
      )}
      {typing && <span className="arcade-caret" />}
      <span className="invisible">{text.slice(count)}</span>
    </span>
  )
}
