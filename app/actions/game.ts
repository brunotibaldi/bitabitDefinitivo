'use server'

import { and, desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  answers,
  dailyComments,
  dailyQuestions,
  profiles,
  questionReports,
  questions,
  questionVotes,
  subjects,
} from '@/lib/db/schema'
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
import { questionInput, REPORT_CATEGORIES, type QuestionInput } from '@/lib/game/question-input'
import { getUserId, requireUser } from '@/lib/session'

export type AnswerResult =
  | {
      ok: true
      isCorrect: boolean
      correctIndex: number
      correctOrder: number[] | null
      explanation: string
      points: number
      comboBonus: number
      combo: number
      streak: number
      streakExtended: boolean
      usedFreeze: boolean
      todayFeedCount: number
      totalPoints: number
    }
  | { ok: false; error: string }

const answerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z.number().int().min(0).max(5),
  selectedOrder: z.array(z.number().int().min(0).max(7)).max(8).optional(),
  isDaily: z.boolean(),
})

function sameOrder(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export async function submitAnswer(input: z.infer<typeof answerSchema>): Promise<AnswerResult> {
  const parsed = answerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Respuesta inválida' }
  const { questionId, selectedIndex, selectedOrder, isDaily } = parsed.data
  const { profile } = await requireUser()
  const userId = profile.userId
  const today = localDate()

  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.status, 'approved')))
  if (!question) return { ok: false, error: 'Pregunta no disponible' }

  let isCorrect: boolean
  if (question.type === 'order') {
    const expected = question.answerOrder ?? []
    if (!selectedOrder || selectedOrder.length !== expected.length || new Set(selectedOrder).size !== expected.length) {
      return { ok: false, error: 'Ordená todos los pasos' }
    }
    isCorrect = sameOrder(selectedOrder, expected)
  } else {
    if (selectedIndex >= question.options.length) return { ok: false, error: 'Opción inválida' }
    isCorrect = selectedIndex === question.correctIndex
  }

  if (isDaily) {
    const [daily] = await db.select().from(dailyQuestions).where(eq(dailyQuestions.date, today))
    if (daily?.questionId !== questionId) return { ok: false, error: 'Esta no es la pregunta del día' }
  }

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for('update')

    const inserted = await tx
      .insert(answers)
      .values({
        userId,
        questionId,
        selectedIndex: question.type === 'order' ? 0 : selectedIndex,
        selectedOrder: question.type === 'order' ? selectedOrder : null,
        isCorrect,
        isDaily,
        localDate: today,
        points: 0,
      })
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

    const activeStreak =
      streakExtended || p.lastActiveDate === today || p.lastActiveDate === addDays(today, -1) ? streak : 0
    let points = Math.round(
      basePoints({ isCorrect, isDaily, difficulty: question.difficulty }) * streakMultiplier(activeStreak),
    )

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
      correctOrder: question.type === 'order' ? (question.answerOrder ?? []) : null,
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

const reportSchema = z.object({
  questionId: z.number().int().positive(),
  category: z.enum(REPORT_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  message: z.string().trim().max(500),
})

export async function reportQuestion(input: z.infer<typeof reportSchema>) {
  const userId = await getUserId()
  const parsed = reportSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Revisá el reporte' }
  const { questionId, category, message } = parsed.data

  const inserted = await db
    .insert(questionReports)
    .values({ questionId, userId, category, message: message || null, reason: category })
    .onConflictDoUpdate({
      target: [questionReports.questionId, questionReports.userId],
      set: { category, message: message || null, status: 'open', resolvedAt: null, createdAt: new Date() },
    })
    .returning({ id: questionReports.id, createdAt: questionReports.createdAt })

  const [{ open }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(questionReports)
    .where(and(eq(questionReports.questionId, questionId), eq(questionReports.status, 'open')))
  await db
    .update(questions)
    .set({
      reportCount: open,
      status: sql`case when ${open} >= 3 and ${questions.status} = 'approved' then 'flagged' else ${questions.status} end`,
    })
    .where(eq(questions.id, questionId))

  return { ok: inserted.length > 0 }
}

export async function voteQuestion(questionId: number, value: -1 | 0 | 1) {
  const userId = await getUserId()
  if (!Number.isInteger(questionId) || ![-1, 0, 1].includes(value)) return null

  return db.transaction(async (tx) => {
    if (value === 0) {
      await tx
        .delete(questionVotes)
        .where(and(eq(questionVotes.userId, userId), eq(questionVotes.questionId, questionId)))
    } else {
      await tx
        .insert(questionVotes)
        .values({ userId, questionId, value })
        .onConflictDoUpdate({ target: [questionVotes.userId, questionVotes.questionId], set: { value } })
    }
    const [counts] = await tx
      .select({
        up: sql<number>`count(*) filter (where ${questionVotes.value} = 1)::int`,
        down: sql<number>`count(*) filter (where ${questionVotes.value} = -1)::int`,
      })
      .from(questionVotes)
      .where(eq(questionVotes.questionId, questionId))
    await tx.update(questions).set({ upvotes: counts.up, downvotes: counts.down }).where(eq(questions.id, questionId))
    return { upvotes: counts.up, downvotes: counts.down, myVote: value }
  })
}

export async function createQuestion(input: QuestionInput) {
  const userId = await getUserId()
  const parsed = questionInput.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Revisá la pregunta' }
  const q = parsed.data

  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, q.subjectId))
  if (!subject) return { ok: false as const, error: 'Materia inválida' }

  const [{ pending }] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(questions)
    .where(and(eq(questions.authorId, userId), eq(questions.status, 'pending')))
  if (pending >= 10) return { ok: false as const, error: 'Tenés 10 preguntas esperando revisión. Esperá a que las aprueben.' }

  await db.insert(questions).values({
    subjectId: q.subjectId,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.type === 'order' ? 0 : q.correctIndex,
    answerOrder: q.type === 'order' ? q.answerOrder : null,
    context: q.context ?? null,
    explanation: q.explanation,
    difficulty: q.difficulty,
    topic: q.topic || null,
    status: 'pending',
    authorId: userId,
  })
  revalidatePath('/crear')
  return { ok: true as const }
}

export async function getMyQuestions() {
  const userId = await getUserId()
  return db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      type: questions.type,
      status: questions.status,
      upvotes: questions.upvotes,
      downvotes: questions.downvotes,
      subjectShort: subjects.shortName,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(eq(questions.authorId, userId))
    .orderBy(desc(questions.createdAt))
    .limit(50)
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
