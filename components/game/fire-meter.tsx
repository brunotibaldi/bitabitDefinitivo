'use client'

import { Flame } from 'lucide-react'
import { FIRE_THRESHOLDS, fireBonusPct, fireLevel } from '@/lib/game/rules'
import { cn } from '@/lib/utils'

const LEVEL_NAME = ['APAGADO', 'CHISPA', 'LLAMA', 'FUEGO', 'INFERNO', 'SUPERNOVA'] as const

const LEVEL_COLOR = [
  'text-muted-foreground',
  'text-game-yellow',
  'text-game-yellow',
  'text-game-red',
  'text-game-red',
  'text-foreground',
] as const

const SEGMENT_COLOR = ['', 'bg-game-yellow', 'bg-game-yellow', 'bg-game-red', 'bg-game-red', 'bg-foreground'] as const

export function FireMeter({ fire, className }: { fire: number; className?: string }) {
  const level = fireLevel(fire)
  const pct = fireBonusPct(fire)
  const next = FIRE_THRESHOLDS.find((t) => t > fire)

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      aria-label={`Fuego: ${fire} seguidas, ${LEVEL_NAME[level].toLowerCase()}, bonus ${pct}%`}
      title={next ? `${next - fire} más para el siguiente nivel` : 'Nivel máximo'}
    >
      <span key={level} className="relative flex size-6 items-center justify-center animate-cool-down">
        <Flame
          className={cn(
            'size-5 transition-all',
            LEVEL_COLOR[level],
            level > 0 && 'fill-current',
            level >= 1 && level < 4 && 'animate-flicker',
            level >= 4 && 'size-6 animate-flicker-fast',
          )}
          aria-hidden="true"
        />
        {level >= 3 && (
          <>
            <span className="absolute -top-1 left-1 size-1 bg-game-yellow animate-ember" aria-hidden="true" />
            <span
              className="absolute -top-1 right-1 size-1 bg-game-red animate-ember"
              style={{ animationDelay: '0.45s' }}
              aria-hidden="true"
            />
          </>
        )}
      </span>
      <span className="flex gap-0.5" aria-hidden="true">
        {FIRE_THRESHOLDS.map((t, i) => (
          <span
            key={t}
            className={cn(
              'h-3 w-2.5 border-2 border-ink transition-colors sm:w-3.5',
              i < level ? SEGMENT_COLOR[level] : 'bg-ink/60',
              i < level && level >= 4 && 'animate-flicker-fast',
            )}
          />
        ))}
      </span>
      <span className={cn('font-pixel text-[9px] tabular-nums', LEVEL_COLOR[level])} aria-hidden="true">
        {fire > 0 ? `x${fire}` : LEVEL_NAME[0]}
      </span>
      {pct > 0 && (
        <span className="border-2 border-ink bg-primary px-1 py-0.5 font-pixel text-[8px] tabular-nums text-primary-foreground" aria-hidden="true">
          +{pct}%
        </span>
      )}
    </div>
  )
}

export function BitsBadge({ bits, className }: { bits: number; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-9 items-center gap-1.5 border-3 border-ink bg-game-blue px-2 font-pixel text-[10px] tabular-nums text-ink',
        className,
      )}
      title="Bits: la moneda para comprar poderes"
    >
      <BitIcon />
      <span className="sr-only">Bits:</span>
      {bits}
    </span>
  )
}

export function BitIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn('flex size-4 items-center justify-center border-2 border-ink bg-primary font-pixel text-[7px] leading-none text-ink', className)}
      aria-hidden="true"
    >
      b
    </span>
  )
}
