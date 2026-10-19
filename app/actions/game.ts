'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { answers, dailyComments, dailyQuestions, profiles, questionReports, questions } from '@/lib/db/schema'
import { addDays, daysBetween, localDate } from '@/lib/game/dates'
import {
  basePoints,
  COMBO_BONUS,
  COMBO_TARGET,
  FEED_ANSWERS_FOR_STREAK,
  MAX_STREAK_FREEZES,
  streakMultiplier,
} from '@/lib/game/rules'
import { getFeedPage } from '@/lib/game/queries'
import { getUserId, requireUser } from '@/lib/session'

export type AnswerResult = {
  ok: true
  isCorrect: boolean
  correctIndex: number
  explanation: string
  points: number
  comboBonus: number
  combo: number
  streak: number
  streakExtended: boolean
  usedFreeze: boolean
  todayFeedCount: number
  totalPoints: number
} | { ok: false; error: string }

const answerInput = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z.number().int().min(0).max(3),
  isDaily: z.boolean(),
})

export async function submitAnswer(input: z.infer<typeof answerInput>): Promise<AnswerResult> {
  const parsed = answerInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Respuesta inválida' }
  const { questionId, selectedIndex, isDaily } = parsed.data
  const { profile } = await requireUser()
  const userId = profile.userId
  const today = localDate()

  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.status, 'approved')))
  if (!question || selectedIndex >= question.options.length) return { ok: false, error: 'Pregunta no disponible' }

  if (isDaily) {
    const [daily] = await db.select().from(dailyQuestions).where(eq(dailyQuestions.date, today))
    if (daily?.questionId !== questionId) return { ok: false, error: 'Esta no es la pregunta del día' }
  }

  const isCorrect = selectedIndex === question.correctIndex

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for('update')

    const inserted = await tx
      .insert(answers)
      .values({ userId, questionId, selectedIndex, isCorrect, isDaily, localDate: today, points: 0 })
      .onConflictDoNothing()
      .returning({ id: answers.id })
    if (!inserted.length) return { ok: false as const, error: 'Ya respondiste esta pregunta' }

    const [{ feedCount }] = await tx
      .select({ feedCount: sql<number>`count(*) filter (where not ${answers.isDaily})::int` })
      .from(answers)
      .where(and(eq(answers.userId, userId), eq(answers.localDate, today)))

    let streak = p.currentStreak
    let freezes = p.streakFreezes
    let streakExtended = false
    let usedFreeze = false
    const qualifies = isDaily || feedCount >= FEED_ANSWERS_FOR_STREAK
    if (qualifies && p.lastActiveDate !== today) {
      const gap = p.lastActiveDate ? daysBetween(p.lastActiveDate, today) : Infinity
      if (gap === 1) streak += 1
      else if (gap - 1 <= freezes) {
        freezes -= gap - 1
        usedFreeze = true
        streak += 1
      } else streak = 1
      streakExtended = true
      if (streak % 7 === 0) freezes = Math.min(freezes + 1, MAX_STREAK_FREEZES)
    }

    const activeStreak = streakExtended || p.lastActiveDate === today || p.lastActiveDate === addDays(today, -1) ? streak : 0
    let points = Math.round(basePoints({ isCorrect, isDaily, difficulty: question.difficulty }) * streakMultiplier(activeStreak))

    let combo = p.combo
    let comboBonus = 0
    if (!isDaily) {
      combo = isCorrect ? combo + 1 : 0
      if (combo >= COMBO_TARGET) {
        comboBonus = COMBO_BONUS
        combo = 0
      }
    }
    points += comboBonus

    await tx.update(answers).set({ points }).where(eq(answers.id, inserted[0].id))
    const totalPoints = p.totalPoints + points
    await tx
      .update(profiles)
      .set({
        totalPoints,
        combo,
        currentStreak: streak,
        longestStreak: Math.max(p.longestStreak, streak),
        streakFreezes: freezes,
        ...(streakExtended ? { lastActiveDate: today } : {}),
      })
      .where(eq(profiles.userId, userId))

    return {
      ok: true as const,
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      points,
      comboBonus,
      combo,
      streak: activeStreak,
      streakExtended,
      usedFreeze,
      todayFeedCount: feedCount,
      totalPoints,
    }
  })
}

export async function loadFeedPage(seed: string, page: number) {
  const { profile } = await requireUser()
  if (!/^\d+-[a-z0-9]+$/.test(seed) || !Number.isInteger(page) || page < 0 || page > 200) return []
  return getFeedPage({ userId: profile.userId, subjectIds: profile.subjectIds, seed, page })
}

export async function reportQuestion(questionId: number, reason: string) {
  const userId = await getUserId()
  if (!Number.isInteger(questionId)) return
  const inserted = await db
    .insert(questionReports)
    .values({ questionId, userId, reason: reason.slice(0, 300) })
    .onConflictDoNothing()
    .returning({ id: questionReports.id })
  if (inserted.length) {
    await db
      .update(questions)
      .set({
        reportCount: sql`${questions.reportCount} + 1`,
        status: sql`case when ${questions.reportCount} + 1 >= 3 then 'flagged' else ${questions.status} end`,
      })
      .where(eq(questions.id, questionId))
  }
}

export async function postDailyComment(body: string) {
  const userId = await getUserId()
  const text = body.trim().slice(0, 500)
  if (!text) return { ok: false, error: 'El comentario está vacío' }
  const today = localDate()
  const [daily] = await db.select().from(dailyQuestions).where(eq(dailyQuestions.date, today))
  if (!daily) return { ok: false, error: 'No hay pregunta del día' }
  const [answered] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.questionId, daily.questionId)))
  if (!answered) return { ok: false, error: 'Respondé la pregunta antes de comentar' }
  await db.insert(dailyComments).values({ date: today, userId, body: text })
  revalidatePath('/hoy')
  return { ok: true }
}

export async function deleteDailyComment(id: number) {
  const userId = await getUserId()
  await db.delete(dailyComments).where(and(eq(dailyComments.id, id), eq(dailyComments.userId, userId)))
  revalidatePath('/hoy')
}

export async function saveSubjects(subjectIds: number[]) {
  const userId = await getUserId()
  const ids = z.array(z.number().int().positive()).max(40).parse(subjectIds)
  await db.update(profiles).set({ subjectIds: ids, onboarded: true }).where(eq(profiles.userId, userId))
  revalidatePath('/', 'layout')
}
