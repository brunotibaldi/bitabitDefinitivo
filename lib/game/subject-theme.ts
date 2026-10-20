import type { CSSProperties } from 'react'

const GLYPHS: Record<number, [string, string]> = {
  1: ['x y z', '∈ ℝ²'],
  2: ['∫ dx', 'lim ∞'],
  3: ['{ }', '; ()'],
  5: ['∂ ∇', '∬ dy'],
  6: ['def λ', '[ ] :'],
  7: ['det A', '⟨u,v⟩'],
  9: ['Σ* δ', 'ε q₀'],
  10: ['∑ ⊂', '∪ ∩'],
  11: ['0101', 'CPU'],
  12: ['∧ ∨', '¬ ⊢'],
  13: ['f(x) ≈', 'h ε'],
  14: ['P(A) σ', 'μ ∼'],
  15: ['O(n)', 'log n'],
  17: ['fork', 'PID $'],
  18: ['λ → τ', '⊢ let'],
  20: ['TCP IP', ')))'],
  21: ['SQL σ', 'π ⨝'],
  22: ['UML', '□ → □'],
  23: ['mutex', 'IRQ ⟳'],
  24: ['A* ◉', '⇢ ◉'],
  25: ['CI/CD', 'git ✓'],
  27: ['Z/nZ', '≡ mod'],
}

export function subjectHue(subjectId: number) {
  return Math.round((subjectId * 137.508) % 360)
}

export type SubjectTheme = {
  hue: number
  accent: string
  soft: string
  slideStyle: CSSProperties
  cardStyle: CSSProperties
}

function tile(hue: number, glyphs: [string, string]) {
  const fill = `oklch(0.62 0.13 ${hue})`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">` +
    `<g fill="${fill}" font-family="monospace" font-weight="700" font-size="17">` +
    `<text x="8" y="40" transform="rotate(-12 8 40)">${glyphs[0]}</text>` +
    `<text x="76" y="112" transform="rotate(10 76 112)">${glyphs[1]}</text>` +
    `</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function subjectTheme(subjectId: number): SubjectTheme {
  const hue = subjectHue(subjectId)
  const glyphs = GLYPHS[subjectId] ?? ['0 1', '1 0']
  return {
    hue,
    accent: `oklch(0.8 0.17 ${hue})`,
    soft: `oklch(0.3 0.08 ${hue})`,
    slideStyle: {
      backgroundColor: `oklch(0.23 0.07 ${hue})`,
      backgroundImage: tile(hue, glyphs),
      backgroundSize: '140px 140px',
    },
    cardStyle: {
      ['--subj' as string]: `oklch(0.8 0.17 ${hue})`,
      ['--subj-soft' as string]: `oklch(0.3 0.08 ${hue})`,
    },
  }
}
