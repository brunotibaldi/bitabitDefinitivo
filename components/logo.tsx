import Link from 'next/link'
import { cn } from '@/lib/utils'

const QUADS = [
  { x: 2, y: 2, fill: 'var(--game-red)', bit: '1' },
  { x: 17, y: 2, fill: 'var(--game-blue)', bit: '0', flip: true },
  { x: 2, y: 17, fill: 'var(--game-yellow)', bit: '0' },
  { x: 17, y: 17, fill: 'var(--game-green)', bit: '1' },
]

/** 2×2 grid of "bits" in the four answer colors. One bit flips periodically. */
export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="0" y="0" width="32" height="32" fill="var(--ink)" />
      {QUADS.map((q) => (
        <g
          key={`${q.x}-${q.y}`}
          className={cn(q.flip && animated && 'animate-bit-flip')}
          style={{ transformOrigin: `${q.x + 6.5}px ${q.y + 6.5}px`, transformBox: 'view-box' }}
        >
          <rect x={q.x} y={q.y} width="13" height="13" fill={q.fill} />
          <rect x={q.x} y={q.y} width="13" height="2" fill="white" opacity="0.35" />
          <rect x={q.x} y={q.y + 11} width="13" height="2" fill="var(--ink)" opacity="0.3" />
          {q.bit === '1' ? (
            <rect x={q.x + 5.5} y={q.y + 3.5} width="2" height="6" fill="var(--ink)" />
          ) : (
            <>
              <rect x={q.x + 4.5} y={q.y + 3.5} width="4" height="1.5" fill="var(--ink)" />
              <rect x={q.x + 4.5} y={q.y + 8} width="4" height="1.5" fill="var(--ink)" />
              <rect x={q.x + 3.5} y={q.y + 4.5} width="1.5" height="4" fill="var(--ink)" />
              <rect x={q.x + 8} y={q.y + 4.5} width="1.5" height="4" fill="var(--ink)" />
            </>
          )}
        </g>
      ))}
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 font-pixel text-xs leading-none tracking-tight', className)}>
      <span>BIT</span>
      <span className="bg-primary px-1 py-0.5 text-primary-foreground">A</span>
      <span>BIT</span>
    </span>
  )
}

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)} aria-label="Bit a Bit, inicio">
      <LogoMark />
      <Wordmark className="text-shadow-pixel" />
    </Link>
  )
}
