import type { PowerupKind } from '@/lib/db/schema'

export const FEED_ANSWERS_FOR_STREAK = 5
export const MAX_STREAK_FREEZES = 2

const DIFFICULTY_MULTIPLIER: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 }

export const HINT_PENALTY = 0.5
export const BITS_PER_CORRECT = 1
export const FIRE_BITS_EVERY = 5
export const FIRE_BITS_BONUS = 3
export const MAX_FIRE_BONUS_PCT = 60

export const POWERUPS: Record<PowerupKind, { cost: number; label: string; short: string }> = {
  remove_one: { cost: 3, label: 'Eliminar 1 opción', short: '-1' },
  remove_two: { cost: 5, label: 'Eliminar 2 opciones', short: '-2' },
  first_item: { cost: 4, label: 'Revelar el primero', short: '1º' },
}

/** Exponential: small at first, ramps up hard on long runs. */
export function fireBonusPct(fire: number) {
  if (fire <= 0) return 0
  return Math.min(MAX_FIRE_BONUS_PCT, Math.round(3 * (1.22 ** fire - 1)))
}

/** 0 = apagado … 5 = infierno. Thresholds grow so each level is harder to reach. */
export const FIRE_THRESHOLDS = [1, 3, 6, 10, 15] as const
export function fireLevel(fire: number) {
  let level = 0
  for (const t of FIRE_THRESHOLDS) if (fire >= t) level++
  return level
}

/** A miss cools the fire instead of killing it, unless it was barely lit. */
export function coolFire(fire: number) {
  const next = Math.floor(fire / 2)
  return next < 2 ? 0 : next
}

export function streakMultiplier(streak: number) {
  return 1 + Math.min(streak * 0.02, 0.5)
}

export function basePoints({
  isCorrect,
  isDaily,
  difficulty,
}: {
  isCorrect: boolean
  isDaily: boolean
  difficulty: number
}) {
  if (isDaily) return isCorrect ? 30 : 5
  if (!isCorrect) return 0
  return Math.round(10 * (DIFFICULTY_MULTIPLIER[difficulty] ?? 1))
}

export function effectiveStreak(
  profile: { currentStreak: number; lastActiveDate: string | null; streakFreezes: number },
  today: string,
  daysSince: (a: string, b: string) => number,
) {
  if (!profile.lastActiveDate) return 0
  const gap = daysSince(profile.lastActiveDate, today)
  if (gap <= 1) return profile.currentStreak
  if (gap - 1 <= profile.streakFreezes) return profile.currentStreak
  return 0
}
