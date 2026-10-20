'use client'

import { useSyncExternalStore } from 'react'

const MUTE_KEY = 'bitabit:muted'
const listeners = new Set<() => void>()
let ctx: AudioContext | null = null

export function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function isMuted() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(muted: boolean) {
  window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  listeners.forEach((l) => l())
}

export function useMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    isMuted,
    () => true,
  )
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; slide?: number; vol?: number }

function play(notes: Note[]) {
  if (isMuted()) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime + 0.01
  const master = ac.createGain()
  master.gain.value = 0.12
  master.connect(ac.destination)
  for (const n of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = n.type ?? 'square'
    osc.frequency.setValueAtTime(n.f, now + n.t)
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, now + n.t + n.d)
    const vol = n.vol ?? 0.6
    gain.gain.setValueAtTime(vol, now + n.t)
    gain.gain.setValueAtTime(vol, now + n.t + n.d * 0.7)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    osc.connect(gain).connect(master)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.02)
  }
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 }

export const sfx = {
  tap: () => play([{ f: 880, t: 0, d: 0.04, vol: 0.35 }]),
  select: () => play([{ f: 440, t: 0, d: 0.05, slide: 660, vol: 0.4 }]),
  correct: () =>
    play([
      { f: NOTE.C5, t: 0, d: 0.07 },
      { f: NOTE.E5, t: 0.07, d: 0.07 },
      { f: NOTE.G5, t: 0.14, d: 0.07 },
      { f: NOTE.C6, t: 0.21, d: 0.16 },
    ]),
  coin: () =>
    play([
      { f: NOTE.B5, t: 0, d: 0.08, vol: 0.5 },
      { f: NOTE.E6, t: 0.08, d: 0.28, vol: 0.5 },
    ]),
  wrong: () =>
    play([
      { f: 300, t: 0, d: 0.14, type: 'sawtooth', slide: 220, vol: 0.5 },
      { f: 200, t: 0.15, d: 0.3, type: 'sawtooth', slide: 90, vol: 0.5 },
    ]),
  combo: () =>
    play([
      { f: NOTE.G5, t: 0, d: 0.08 },
      { f: NOTE.C6, t: 0.08, d: 0.08 },
      { f: NOTE.E6, t: 0.16, d: 0.08 },
      { f: NOTE.G6, t: 0.24, d: 0.1 },
      { f: NOTE.E6, t: 0.34, d: 0.08 },
      { f: NOTE.G6, t: 0.42, d: 0.3 },
      { f: NOTE.C5 / 2, t: 0, d: 0.7, type: 'triangle', vol: 0.8 },
    ]),
  streak: () =>
    play([
      { f: 220, t: 0, d: 0.5, slide: 880, type: 'square', vol: 0.35 },
      { f: NOTE.A5, t: 0.45, d: 0.1 },
      { f: NOTE.C6, t: 0.55, d: 0.25 },
    ]),
  vote: (up: boolean) => play([{ f: up ? 700 : 500, t: 0, d: 0.06, slide: up ? 1100 : 300, vol: 0.4 }]),
  send: () =>
    play([
      { f: 600, t: 0, d: 0.05 },
      { f: 900, t: 0.05, d: 0.05 },
      { f: 1200, t: 0.1, d: 0.1 },
    ]),
}
