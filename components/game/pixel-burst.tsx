const COLORS = ['var(--game-red)', 'var(--game-blue)', 'var(--game-yellow)', 'var(--game-green)']

/** Square "pixel" particles exploding from the center of the parent. Deterministic per `seed`. */
export function PixelBurst({ seed = 1, count = 18 }: { seed?: number; count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + seed
    const dist = 70 + ((i * 37 + seed * 13) % 60)
    return {
      dx: `${Math.round(Math.cos(angle) * dist)}px`,
      dy: `${Math.round(Math.sin(angle) * dist)}px`,
      color: COLORS[(i + seed) % 4],
      size: 6 + ((i * 7) % 3) * 3,
      delay: (i % 4) * 25,
    }
  })
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute border-2 border-ink"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              '--dx': p.dx,
              '--dy': p.dy,
              animation: `pixel-burst 650ms steps(8, end) ${p.delay}ms forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
