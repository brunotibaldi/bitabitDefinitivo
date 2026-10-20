'use client'

import { audio } from './sfx'

const BASE_BPM = 138
const BPM_PER_FIRE = 6
const MAX_FIRE_TEMPO = 8
const MAX_BPM = BASE_BPM + BPM_PER_FIRE * MAX_FIRE_TEMPO
// Per-sixteenth easing toward the target tempo: speeding up is noticeable within a bar,
// cooling down glides back over a few seconds.
const RISE_EASE = 0.05
const FALL_EASE = 0.012
const LOOKAHEAD = 0.15
const VOLUME = 0.045
const BASE_CUTOFF = 3200
const MAX_CUTOFF = 7500

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

// Am – F – C – G, one bar each, 16 sixteenth-steps per bar.
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
]
const ARP = [0, 1, 2, 1]
// Lead melody over the 4 bars (null = rest). Two variations alternate.
const LEAD: (number | null)[][] = [
  [76, null, 76, 79, null, 76, null, 74, 72, null, 74, null, 76, null, null, null,
   77, null, 76, 74, null, 72, null, 69, 72, null, null, null, null, null, 69, 72,
   76, null, 79, 81, null, 79, null, 76, 74, null, 72, null, 74, null, null, null,
   74, null, 76, 74, null, 71, null, 67, 71, null, 74, null, 71, null, null, null],
  [69, null, 72, 76, null, 74, null, 72, 76, null, 79, null, 81, null, 79, null,
   77, null, null, 76, null, 77, null, 81, 79, null, 77, null, 76, null, null, null,
   76, null, 72, null, 76, null, 79, null, 84, null, 81, null, 79, null, 76, null,
   74, null, 79, null, 74, null, 71, null, 74, null, null, null, null, null, null, null],
]

let timer: ReturnType<typeof setInterval> | null = null
let master: GainNode | null = null
let filter: BiquadFilterNode | null = null
let noiseBuf: AudioBuffer | null = null
let step = 0
let nextTime = 0
let bpm = BASE_BPM
let targetBpm = BASE_BPM

/** Drives tempo and tension from the current answer streak. Safe to call while stopped. */
export function setMusicFire(fire: number) {
  targetBpm = BASE_BPM + BPM_PER_FIRE * Math.min(Math.max(fire, 0), MAX_FIRE_TEMPO)
}

function tone(ac: AudioContext, out: AudioNode, f: number, t: number, d: number, type: OscillatorType, vol: number) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  g.gain.setValueAtTime(vol, t)
  g.gain.setValueAtTime(vol, t + d * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + d + 0.02)
}

function hat(ac: AudioContext, out: AudioNode, t: number, vol: number) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const src = ac.createBufferSource()
  const hp = ac.createBiquadFilter()
  const g = ac.createGain()
  src.buffer = noiseBuf
  hp.type = 'highpass'
  hp.frequency.value = 7000
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  src.connect(hp).connect(g).connect(out)
  src.start(t)
}

/** 0 at base tempo, 1 at max — derived from the smoothed tempo so layers fade with it. */
function tension() {
  return (bpm - BASE_BPM) / (MAX_BPM - BASE_BPM)
}

function scheduleStep(ac: AudioContext, out: AudioNode, s: number, t: number, len: number) {
  const bar = Math.floor(s / 16) % 4
  const inBar = s % 16
  const chord = CHORDS[bar]
  const lead = LEAD[Math.floor(s / 64) % 2][s % 64]
  const k = tension()

  if (inBar % 2 === 0) {
    const root = chord[0] - 24 + (inBar % 4 === 2 ? 12 : 0)
    tone(ac, out, midi(root), t, len * 1.8, 'triangle', 0.9)
  } else if (k > 0.55) {
    // Driving octave bass on the off-sixteenths once things heat up.
    tone(ac, out, midi(chord[0] - 12), t, len * 0.7, 'triangle', 0.45 * k)
  }
  tone(ac, out, midi(chord[ARP[inBar % 4]] + 12), t, len * 0.8, 'square', 0.12 + 0.06 * k)
  if (lead !== null) tone(ac, out, midi(lead), t, len * 1.9, 'square', 0.22)

  if (inBar % 4 === 2) hat(ac, out, t, 0.25)
  else if (k > 0.15 && inBar % 2 === 0) hat(ac, out, t, 0.14 * k + 0.06)
  else if (k > 0.7) hat(ac, out, t, 0.1 * k)

  const kick = k > 0.35 ? inBar % 4 === 0 : inBar % 8 === 0
  if (kick) tone(ac, out, 150, t, 0.08, 'sine', 0.5)

  // A rising alarm blip on the last beat of each 2-bar phrase at high tension.
  if (k > 0.45 && s % 32 === 28) tone(ac, out, midi(84 + Math.round(k * 7)), t, len * 3, 'square', 0.08 * k)
}

export function startMusic() {
  if (timer) return
  const ac = audio()
  if (!ac) return
  master = ac.createGain()
  filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = BASE_CUTOFF
  master.gain.setValueAtTime(0.0001, ac.currentTime)
  master.gain.exponentialRampToValueAtTime(VOLUME, ac.currentTime + 1.5)
  master.connect(filter).connect(ac.destination)
  nextTime = ac.currentTime + 0.05
  const out = master
  const lp = filter
  timer = setInterval(() => {
    while (nextTime < ac.currentTime + LOOKAHEAD) {
      bpm += (targetBpm - bpm) * (targetBpm > bpm ? RISE_EASE : FALL_EASE)
      const len = 60 / bpm / 4
      lp.frequency.setTargetAtTime(BASE_CUTOFF + (MAX_CUTOFF - BASE_CUTOFF) * tension(), nextTime, 0.2)
      scheduleStep(ac, out, step, nextTime, len)
      step = (step + 1) % 128
      nextTime += len
    }
  }, 25)
}

export function stopMusic() {
  if (!timer) return
  clearInterval(timer)
  timer = null
  const ac = audio()
  if (ac && master) {
    const m = master
    const f = filter
    m.gain.cancelScheduledValues(ac.currentTime)
    m.gain.setValueAtTime(m.gain.value, ac.currentTime)
    m.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
    setTimeout(() => {
      m.disconnect()
      f?.disconnect()
    }, 400)
  }
  master = null
  filter = null
}
