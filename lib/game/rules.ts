export const FEED_ANSWERS_FOR_STREAK = 5
export const COMBO_TARGET = 5
export const COMBO_BONUS = 10
export const MAX_STREAK_FREEZES = 2

const DIFFICULTY_MULTIPLIER: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 }

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
