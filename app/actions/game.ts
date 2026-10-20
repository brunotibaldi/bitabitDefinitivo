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
  questionAssists,
  questionReports,
  questions,
  questionVotes,
  SEQUENCE_TYPES,
  subjects,
  type PowerupKind,
  type QuestionType,
} from '@/lib/db/schema'
import { addDays, daysBetween, localDate } from '@/lib/game/dates'
import {
  basePoints,
  BITS_PER_CORRECT,
  coolFire,
  FEED_ANSWERS_FOR_STREAK,
  FIRE_BITS_BONUS,
  FIRE_BITS_EVERY,
  fireBonusPct,
  HINT_PENALTY,
  MAX_STREAK_FREEZES,
  POWERUPS,
  streakMultiplier,
} from '@/lib/game/rules'
import { getFeedPage } from '@/lib/game/queries'
import { questionInput, REPORT_CATEGORIES, type QuestionInput } from '@/lib/game/question-input'
import { getUserId, requireUser } from '@/lib/session'

export type AnswerStats = { counts: number[]; total: number; correctPct: number }

export type AnswerResult =
  | {
      ok: true
      isCorrect: boolean
      correctIndex: number
      correctOrder: number[] | null
      explanation: string
      points: number
      fireBonus: number
      fireBonusPct: number
      fire: number
      prevFire: number
      bits: number
      bitsEarned: number
      hintUsed: boolean
      stats: AnswerStats
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

const isSequence = (type: QuestionType) => SEQUENCE_TYPES.includes(type)

async function answerStats(questionId: number, optionCount: number, executor: Pick<typeof db, 'select'> = db) {
  const rows = await executor
    .select({
      selectedIndex: answers.selectedIndex,
      count: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${answers.isCorrect})::int`,
    })
    .from(answers)
    .where(eq(answers.questionId, questionId))
    .groupBy(answers.selectedIndex)
  const counts = Array.from({ length: optionCount }, () => 0)
  let total = 0
  let correct = 0
  for (const r of rows) {
    if (r.selectedIndex < optionCount) counts[r.selectedIndex] += r.count
    total += r.count
    correct += r.correct
  }
  return { counts, total, correctPct: total ? Math.round((correct / total) * 100) : 0 }
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

  const [assist] = await db
    .select()
    .from(questionAssists)
    .where(and(eq(questionAssists.userId, userId), eq(questionAssists.questionId, questionId)))
  const hintUsed = Boolean(assist?.hintUsed)

  let isCorrect: boolean
  if (isSequence(question.type)) {
    const expected = question.answerOrder ?? []
    if (!selectedOrder || selectedOrder.length !== expected.length || new Set(selectedOrder).size !== expected.length) {
      return { ok: false, error: question.type === 'match' ? 'Uní todos los pares' : 'Ordená todos los pasos' }
    }
    isCorrect = sameOrder(selectedOrder, expected)
  } else {
    if (selectedIndex >= question.options.length) return { ok: false, error: 'Opción inválida' }
    if (assist?.removed.includes(selectedIndex)) return { ok: false, error: 'Esa opción fue eliminada' }
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
        selectedIndex: isSequence(question.type) ? 0 : selectedIndex,
        selectedOrder: isSequence(question.type) ? selectedOrder : null,
        isCorrect,
        isDaily,
        hintUsed,
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
    const prevFire = p.combo
    const fire = isDaily ? prevFire : isCorrect ? prevFire + 1 : coolFire(prevFire)
    const bonusPct = isCorrect && !isDaily ? fireBonusPct(fire) : 0

    let base = basePoints({ isCorrect, isDaily, difficulty: question.difficulty }) * streakMultiplier(activeStreak)
    if (hintUsed) base *= HINT_PENALTY
    const fireBonus = Math.round(base * (bonusPct / 100))
    const points = Math.round(base) + fireBonus

    let bitsEarned = 0
    if (isCorrect) {
      bitsEarned += BITS_PER_CORRECT
      if (!isDaily && fire > 0 && fire % FIRE_BITS_EVERY === 0) bitsEarned += FIRE_BITS_BONUS
    }
    const bits = p.bits + bitsEarned

    await tx.update(answers).set({ points }).where(eq(answers.id, inserted[0].id))
    const totalPoints = p.totalPoints + points
    await tx
      .update(profiles)
      .set({
        totalPoints,
        combo: fire,
        bestCombo: Math.max(p.bestCombo, fire),
        bits,
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
      correctOrder: isSequence(question.type) ? (question.answerOrder ?? []) : null,
      explanation: question.explanation,
      points,
      fireBonus,
      fireBonusPct: bonusPct,
      fire,
      prevFire,
      bits,
      bitsEarned,
      hintUsed,
      stats: await answerStats(questionId, question.options.length, tx),
      streak: activeStreak,
      streakExtended,
      usedFreeze,
      todayFeedCount: feedCount,
      totalPoints,
    }
  })
}

async function playableQuestion(userId: string, questionId: number) {
  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.status, 'approved')))
  if (!question) return { error: 'Pregunta no disponible' } as const
  const [answered] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.questionId, questionId)))
    .limit(1)
  if (answered) return { error: 'Ya respondiste esta pregunta' } as const
  return { question } as const
}

export async function revealHint(questionId: number) {
  const userId = await getUserId()
  if (!Number.isInteger(questionId) || questionId <= 0) return { ok: false as const, error: 'Pregunta inválida' }
  const res = await playableQuestion(userId, questionId)
  if ('error' in res) return { ok: false as const, error: res.error }
  if (!res.question.hint) return { ok: false as const, error: 'Esta pregunta no tiene pista' }
  await db
    .insert(questionAssists)
    .values({ userId, questionId, hintUsed: true })
    .onConflictDoUpdate({ target: [questionAssists.userId, questionAssists.questionId], set: { hintUsed: true } })
  return { ok: true as const, hint: res.question.hint as string }
}

const powerupSchema = z.object({
  questionId: z.number().int().positive(),
  kind: z.enum(['remove_one', 'remove_two', 'first_item']),
})

export type PowerupResult =
  | { ok: true; kind: PowerupKind; removed: number[]; firstItem: number | null; bits: number; cost: number }
  | { ok: false; error: string }

export async function buyPowerup(input: { questionId: number; kind: PowerupKind }): Promise<PowerupResult> {
  const parsed = powerupSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Poder inválido' }
  const { questionId, kind } = parsed.data
  const userId = await getUserId()
  const res = await playableQuestion(userId, questionId)
  if ('error' in res) return { ok: false, error: res.error ?? 'Pregunta no disponible' }
  const q = res.question
  const sequence = isSequence(q.type)

  if (kind === 'first_item' && !sequence) return { ok: false, error: 'Solo para preguntas de ordenar o unir' }
  if (kind !== 'first_item' && (sequence || q.type === 'true_false')) {
    return { ok: false, error: 'Este poder no aplica a esta pregunta' }
  }

  return db.transaction(async (tx) => {
    const [assist] = await tx
      .select()
      .from(questionAssists)
      .where(and(eq(questionAssists.userId, userId), eq(questionAssists.questionId, questionId)))
    const removed = assist?.removed ?? []
    const [p] = await tx.select({ bits: profiles.bits }).from(profiles).where(eq(profiles.userId, userId)).for('update')

    if (kind === 'first_item' && assist?.firstRevealed) {
      return { ok: true as const, kind, removed, firstItem: q.answerOrder?.[0] ?? null, bits: p.bits, cost: 0 }
    }

    let nextRemoved = removed
    if (kind !== 'first_item') {
      const take = kind === 'remove_two' ? 2 : 1
      const pool = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex && !removed.includes(i))
      if (pool.length - take < 1) return { ok: false as const, error: 'No quedan opciones para eliminar' }
      const picked = pool.sort(() => Math.random() - 0.5).slice(0, take)
      nextRemoved = [...removed, ...picked].sort((a, b) => a - b)
    }

    const { cost } = POWERUPS[kind]
    if (p.bits < cost) return { ok: false as const, error: `Te faltan ${cost - p.bits} bits` }
    const bits = p.bits - cost
    await tx.update(profiles).set({ bits }).where(eq(profiles.userId, userId))
    await tx
      .insert(questionAssists)
      .values({ userId, questionId, removed: nextRemoved, firstRevealed: kind === 'first_item' })
      .onConflictDoUpdate({
        target: [questionAssists.userId, questionAssists.questionId],
        set: kind === 'first_item' ? { firstRevealed: true } : { removed: nextRemoved },
      })

    return {
      ok: true as const,
      kind,
      removed: nextRemoved,
      firstItem: kind === 'first_item' ? (q.answerOrder?.[0] ?? null) : null,
      bits,
      cost,
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
  const ids = z.array(z.number().int().positive()).max(200).parse(subjectIds)
  await db.update(profiles).set({ subjectIds: ids, onboarded: true }).where(eq(profiles.userId, userId))
  revalidatePath('/', 'layout')
}
