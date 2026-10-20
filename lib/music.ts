'use client'

import { audio } from './sfx'

const BPM = 138
const STEP = 60 / BPM / 4
const LOOKAHEAD = 0.15
const VOLUME = 0.045

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
let noiseBuf: AudioBuffer | null = null
let step = 0
let nextTime = 0

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

function scheduleStep(ac: AudioContext, out: AudioNode, s: number, t: number) {
  const bar = Math.floor(s / 16) % 4
  const inBar = s % 16
  const chord = CHORDS[bar]
  const lead = LEAD[Math.floor(s / 64) % 2][s % 64]

  if (inBar % 2 === 0) {
    const root = chord[0] - 24 + (inBar % 4 === 2 ? 12 : 0)
    tone(ac, out, midi(root), t, STEP * 1.8, 'triangle', 0.9)
  }
  tone(ac, out, midi(chord[ARP[inBar % 4]] + 12), t, STEP * 0.8, 'square', 0.12)
  if (lead !== null) tone(ac, out, midi(lead), t, STEP * 1.9, 'square', 0.22)
  if (inBar % 4 === 2) hat(ac, out, t, 0.25)
  if (inBar % 8 === 0) tone(ac, out, 150, t, 0.08, 'sine', 0.5)
}

export function startMusic() {
  if (timer) return
  const ac = audio()
  if (!ac) return
  master = ac.createGain()
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3200
  master.gain.setValueAtTime(0.0001, ac.currentTime)
  master.gain.exponentialRampToValueAtTime(VOLUME, ac.currentTime + 1.5)
  master.connect(lp).connect(ac.destination)
  nextTime = ac.currentTime + 0.05
  const out = master
  timer = setInterval(() => {
    while (nextTime < ac.currentTime + LOOKAHEAD) {
      scheduleStep(ac, out, step, nextTime)
      step = (step + 1) % 128
      nextTime += STEP
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
    m.gain.cancelScheduledValues(ac.currentTime)
    m.gain.setValueAtTime(m.gain.value, ac.currentTime)
    m.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
    setTimeout(() => m.disconnect(), 400)
  }
  master = null
}
