'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { setMusicFire, startMusic, stopMusic } from '@/lib/music'
import { useMuted } from '@/lib/sfx'
import { useStats } from '@/components/stats-provider'

const GAME_ROUTES = ['/', '/hoy']

export function BackgroundMusic() {
  const pathname = usePathname()
  const muted = useMuted()
  const { fire } = useStats()
  const [unlocked, setUnlocked] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (unlocked) return
    const unlock = () => setUnlocked(true)
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [unlocked])

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const playing = unlocked && visible && !muted && GAME_ROUTES.includes(pathname)

  useEffect(() => {
    if (playing) startMusic()
    else stopMusic()
  }, [playing])

  useEffect(() => {
    setMusicFire(fire)
  }, [fire])

  useEffect(() => stopMusic, [])

  return null
}
