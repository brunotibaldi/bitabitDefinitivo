'use client'

export type ShakeKind = 'tap' | 'soft' | 'hard' | 'boom'

const CLASSES = ['screen-shake-tap', 'screen-shake-soft', 'screen-shake-hard', 'screen-shake-boom']
const VIBRATE: Record<ShakeKind, number | number[]> = { tap: 8, soft: 18, hard: [40, 30, 50], boom: [30, 20, 70] }

export function shake(kind: ShakeKind) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const root = document.querySelector<HTMLElement>('[data-shake-root]') ?? document.body
  root.classList.remove(...CLASSES)
  // Force reflow so the same animation can restart back-to-back.
  void root.offsetWidth
  root.classList.add(`screen-shake-${kind}`)
  window.setTimeout(() => root.classList.remove(`screen-shake-${kind}`), 650)
  navigator.vibrate?.(VIBRATE[kind])
}
