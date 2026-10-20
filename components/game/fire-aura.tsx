'use client'

import { Flame } from 'lucide-react'
import { fireLevel } from '@/lib/game/rules'
import { cn } from '@/lib/utils'

const TOP = 13
const SIDE = 6
const MAX_FIRE = 20

/** Deterministic 0–1 noise so tongues keep their shape between renders. */
function noise(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const PALETTES = [
  { outer: 'var(--game-red)', mid: 'var(--fire-orange)', core: 'var(--game-yellow)' },
  { outer: 'var(--game-red)', mid: 'var(--fire-orange)', core: 'var(--game-yellow)' },
  { outer: 'var(--game-red)', mid: 'var(--fire-orange)', core: 'var(--game-yellow)' },
  { outer: 'var(--game-red)', mid: 'var(--game-yellow)', core: 'var(--foreground)' },
  { outer: 'var(--game-red)', mid: 'var(--game-yellow)', core: 'var(--foreground)' },
  { outer: 'var(--game-blue)', mid: 'var(--game-red)', core: 'var(--foreground)' },
] as const

export function FireAura({ fire }: { fire: number }) {
  if (fire <= 0) return null
  const level = fireLevel(fire)
  const t = Math.min(fire, MAX_FIRE) / MAX_FIRE
  const topH = Math.round(16 + t * 64)
  const sideH = Math.round(8 + t * 26)
  const width = Math.round(10 + t * 6)
  const speed = 0.62 - t * 0.3
  const palette = PALETTES[Math.min(level, PALETTES.length - 1)]
  const embers = Math.min(Math.max(fire - 1, 0) * 2, 18)

  const style = {
    '--f-outer': palette.outer,
    '--f-mid': palette.mid,
    '--f-core': palette.core,
    '--f-w': `${width}px`,
    '--f-glow': `${Math.round(10 + t * 40)}px`,
    '--f-glow-alpha': `${Math.round(30 + t * 45)}%`,
  } as React.CSSProperties

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={style}>
      <div key={fire} className="fire-flare absolute inset-0">
        <div className="fire-glow absolute -inset-1 -z-10" />
        <div className="fire-ring absolute -inset-2" />

        <div className="absolute inset-x-1 bottom-full flex items-end justify-between">
          {Array.from({ length: TOP }, (_, i) => {
            const n = noise(i + 1)
            const edge = Math.min(i, TOP - 1 - i) / (TOP / 2)
            const h = topH * (0.45 + 0.35 * n + 0.3 * edge)
            return <Tongue key={i} h={h} delay={-n * 2} dur={speed + n * 0.25} flip={i % 2 === 1} />
          })}
        </div>

        {(['left', 'right'] as const).map((side) =>
          Array.from({ length: SIDE }, (_, i) => {
            const n = noise(i + (side === 'left' ? 40 : 80))
            const h = sideH * (0.6 + 0.5 * n)
            const y = 8 + (i / (SIDE - 1)) * 84
            return (
              <div
                key={`${side}-${i}`}
                className="absolute"
                style={{
                  [side]: 0,
                  top: `calc(${y}% - ${h}px)`,
                  height: h,
                  width,
                  transformOrigin: side === 'left' ? 'bottom left' : 'bottom right',
                  transform: `rotate(${side === 'left' ? -90 : 90}deg)`,
                }}
              >
                <Tongue h={h} delay={-n * 2} dur={speed + n * 0.3} flip={side === 'right'} />
              </div>
            )
          }),
        )}

        {Array.from({ length: embers }, (_, i) => {
          const n = noise(i + 200)
          return (
            <span
              key={`e-${i}`}
              className="fire-ember absolute bottom-full"
              style={{
                left: `${4 + n * 92}%`,
                animationDelay: `${-noise(i + 300) * 1.6}s`,
                animationDuration: `${1.1 + n * 0.9}s`,
                ['--rise' as string]: `${topH + 30 + n * 40}px`,
                ['--drift' as string]: `${(n - 0.5) * 30}px`,
              }}
            />
          )
        })}
      </div>

      <span
        key={`badge-${fire}`}
        className={cn(
          'absolute -top-4 right-3 z-20 flex animate-pop-in items-center gap-1 border-3 border-ink px-1.5 py-1 font-pixel text-[9px] tabular-nums text-ink',
          level >= 5 ? 'bg-game-blue' : level >= 3 ? 'bg-game-red' : 'bg-game-yellow',
        )}
      >
        <Flame className="size-3.5 animate-flicker-fast fill-current" />x{fire}
      </span>
    </div>
  )
}

function Tongue({ h, delay, dur, flip }: { h: number; delay: number; dur: number; flip: boolean }) {
  return (
    <span
      className={cn('fire-tongue block', flip && 'fire-tongue-flip')}
      style={{ height: h, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
    />
  )
}
