'use client'

import { useEffect, useRef } from 'react'

/** CSS pixels per fire "pixel" — the canvas is drawn low-res and scaled up crisp. */
const PX = 4
const PAD_TOP = 30
const PAD_SIDE = 9
const TICK_MS = 1000 / 14
export const MAX_FIRE_LEVEL = 5

type Spec = {
  top: number
  side: number
  embers: number
  speed: number
  orange: number
  yellow: number
  cream: number
}

const OFF: Spec = { top: 0, side: 0, embers: 0, speed: 1, orange: 0, yellow: 0, cream: 0 }

/** Heights are in fire pixels. Each step is a clearly visible jump; 5 is the full blaze. */
const LEVELS: Spec[] = [
  OFF,
  { top: 1.6, side: 0, embers: 0, speed: 0.7, orange: 0.45, yellow: 0, cream: 0 },
  { top: 3.6, side: 1.2, embers: 0, speed: 0.9, orange: 0.6, yellow: 0.25, cream: 0 },
  { top: 6.8, side: 2.6, embers: 0.12, speed: 1.1, orange: 0.66, yellow: 0.38, cream: 0 },
  { top: 11, side: 4, embers: 0.35, speed: 1.3, orange: 0.7, yellow: 0.45, cream: 0 },
  { top: 18, side: 6.5, embers: 1, speed: 1.55, orange: 0.74, yellow: 0.5, cream: 0.14 },
]

const KEYS = Object.keys(OFF) as (keyof Spec)[]

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; smoke: boolean }

function hash(a: number, b: number) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Layered waves give the irregular, peaked tongues of the reference sprite. */
function tongue(i: number, t: number, seed: number) {
  const s =
    0.5 +
    0.3 * Math.sin(i * 0.27 + t * 2 + seed) +
    0.17 * Math.sin(i * 0.66 - t * 3.3 + seed * 2) +
    0.08 * Math.sin(i * 1.6 + t * 6 + seed * 3)
  return 0.22 + 0.78 * Math.max(0, s) ** 1.45
}

export function FireAura({ fire }: { fire: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useRef<{ setLevel: (level: number) => void } | null>(null)
  const level = Math.min(Math.max(fire, 0), MAX_FIRE_LEVEL)

  useEffect(() => {
    const canvas = canvasRef.current
    const card = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !card || !ctx) return

    const css = getComputedStyle(document.documentElement)
    const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
    const C = {
      red: color('--fire-red', '#e8220c'),
      orange: color('--fire-orange', '#f7760d'),
      yellow: color('--fire-yellow', '#ffd21f'),
      cream: color('--fire-cream', '#fff3c4'),
      smoke: color('--fire-smoke', '#6b6b7a'),
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cols = 0
    let rows = 0
    let target: Spec = OFF
    let current: Spec = { ...OFF }
    let boost = 1
    let lastLevel = 0
    let particles: Particle[] = []
    let t = 0
    let frame = 0
    let raf = 0
    let last = 0

    function resize() {
      if (!canvas || !card) return
      cols = Math.ceil(card.clientWidth / PX)
      rows = Math.ceil(card.clientHeight / PX)
      canvas.width = cols + PAD_SIDE * 2
      canvas.height = rows + PAD_TOP
      Object.assign(canvas.style, {
        left: `${-PAD_SIDE * PX}px`,
        top: `${-PAD_TOP * PX}px`,
        width: `${canvas.width * PX}px`,
        height: `${canvas.height * PX}px`,
      })
      draw()
    }

    function layerColor(d: number, hC: number, hY: number, hO: number) {
      if (d < hC) return C.cream
      if (d < hY) return C.yellow
      if (d < hO) return C.orange
      return C.red
    }

    function column(i: number, H: number, spec: Spec, seed: number) {
      const jitter = hash(i + seed, frame) - 0.5
      const h = Math.max(0, Math.round(H * tongue(i, t, seed) + jitter * Math.min(H * 0.5, 1.4)))
      const hO = Math.min(h - 1, Math.round(H * spec.orange * tongue(i, t * 1.2, seed + 3)))
      const hY = Math.min(hO - 1, Math.round(H * spec.yellow * tongue(i, t * 1.4, seed + 7)))
      const hC = spec.cream > 0 ? Math.min(hY, Math.max(1, Math.round(H * spec.cream * (0.7 + 0.5 * hash(i, frame >> 2))))) : 0
      return { h, hO, hY, hC }
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const spec = current
      const baseY = PAD_TOP - 1

      if (spec.top > 0.4) {
        const H = spec.top * boost
        for (let i = 0; i < cols; i++) {
          const { h, hO, hY, hC } = column(i, H, spec, 1)
          for (let d = 0; d < h; d++) {
            ctx.fillStyle = layerColor(d, hC, hY, hO)
            ctx.fillRect(PAD_SIDE + i, baseY - d, 1, 1)
          }
          if (h > 3 && hash(i, frame) > 0.93) {
            ctx.fillStyle = C.red
            ctx.fillRect(PAD_SIDE + i, baseY - h - 1 - Math.round(hash(i + 9, frame) * 2), 1, 1)
          }
        }
      }

      if (spec.side > 0.4) {
        for (let j = 0; j < rows; j++) {
          const taper = Math.max(0, 1 - j / rows) ** 0.9
          const H = spec.side * boost * taper
          if (H < 0.6) continue
          for (const dir of [-1, 1] as const) {
            const { h, hO, hY, hC } = column(j, H, spec, dir === -1 ? 20 : 40)
            const edgeX = dir === -1 ? PAD_SIDE - 1 : PAD_SIDE + cols
            for (let d = 0; d < h; d++) {
              ctx.fillStyle = layerColor(d, hC, hY, hO)
              ctx.fillRect(edgeX + dir * d, PAD_TOP + j, 1, 1)
            }
          }
        }
      }

      for (const p of particles) {
        const k = p.life / p.max
        ctx.globalAlpha = p.smoke ? 0.55 * k : 1
        ctx.fillStyle = p.smoke ? C.smoke : k > 0.66 ? C.yellow : k > 0.33 ? C.orange : C.red
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.smoke && k > 0.5 ? 2 : 1, p.smoke && k > 0.5 ? 2 : 1)
      }
      ctx.globalAlpha = 1
    }

    function step() {
      frame++
      t += 0.12 * (target.speed || 1)
      const rate = target === OFF ? 0.4 : 0.22
      const next = { ...current }
      for (const k of KEYS) next[k] = current[k] + (target[k] - current[k]) * rate
      current = next
      boost = 1 + (boost - 1) * 0.86

      const spawn = current.embers * boost
      for (let n = 0; n < 3; n++) {
        if (Math.random() < spawn * 0.6) {
          particles.push({
            x: PAD_SIDE + Math.random() * cols,
            y: PAD_TOP - 2 - Math.random() * current.top * 0.8,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.6 + Math.random() * 0.9),
            life: 10 + Math.random() * 10,
            max: 20,
            smoke: false,
          })
        }
      }
      particles = particles
        .map((p) => ({ ...p, x: p.x + p.vx + (Math.random() - 0.5) * 0.4, y: p.y + p.vy, life: p.life - 1 }))
        .filter((p) => p.life > 0 && p.y > 0)
    }

    function loop(now: number) {
      if (now - last >= (reduced ? 400 : TICK_MS)) {
        last = now
        step()
        draw()
      }
      const idle = target === OFF && current.top < 0.3 && current.side < 0.3 && particles.length === 0
      if (idle) {
        current = { ...OFF }
        draw()
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }

    function setLevel(lvl: number) {
      if (lvl > lastLevel) boost = 1.45
      if (lvl === 0 && lastLevel > 0) {
        for (let n = 0; n < 10 + lastLevel * 6; n++) {
          particles.push({
            x: PAD_SIDE + Math.random() * cols,
            y: PAD_TOP - 1 - Math.random() * 3,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -(0.3 + Math.random() * 0.4),
            life: 10 + Math.random() * 12,
            max: 22,
            smoke: true,
          })
        }
      }
      lastLevel = lvl
      target = LEVELS[lvl]
      if (!raf) raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(card)
    resize()
    engine.current = { setLevel }

    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      engine.current = null
    }
  }, [])

  useEffect(() => {
    engine.current?.setLevel(level)
  }, [level])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute z-10"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
