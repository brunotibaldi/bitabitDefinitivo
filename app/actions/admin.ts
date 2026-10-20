'use server'

import { and, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { profiles, questionReports, questions } from '@/lib/db/schema'
import { questionInput, type QuestionInput } from '@/lib/game/question-input'
import { assertAdmin } from '@/lib/session'

const AUTHOR_BONUS = 25

function refresh() {
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function resolveReports(questionId: number) {
  await assertAdmin()
  await db
    .update(questionReports)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(eq(questionReports.questionId, questionId), eq(questionReports.status, 'open')))
  await db
    .update(questions)
    .set({
      reportCount: 0,
      status: sql`case when ${questions.status} = 'flagged' then 'approved' else ${questions.status} end`,
    })
    .where(eq(questions.id, questionId))
  refresh()
}

export async function setQuestionStatus(questionId: number, status: 'approved' | 'rejected') {
  await assertAdmin()
  if (!Number.isInteger(questionId) || !['approved', 'rejected'].includes(status)) return

  const [q] = await db
    .select({ status: questions.status, authorId: questions.authorId })
    .from(questions)
    .where(eq(questions.id, questionId))
  if (!q) return

  await db.update(questions).set({ status, reviewedAt: new Date() }).where(eq(questions.id, questionId))
  if (status === 'approved' && q.status === 'pending' && q.authorId) {
    await db
      .update(profiles)
      .set({ totalPoints: sql`${profiles.totalPoints} + ${AUTHOR_BONUS}` })
      .where(eq(profiles.userId, q.authorId))
  }
  if (status === 'rejected') {
    await db
      .update(questionReports)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(and(eq(questionReports.questionId, questionId), eq(questionReports.status, 'open')))
  }
  refresh()
}

export async function updateQuestion(questionId: number, input: QuestionInput) {
  await assertAdmin()
  const parsed = questionInput.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Revisá la pregunta' }
  const q = parsed.data
  await db
    .update(questions)
    .set({
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
    })
    .where(eq(questions.id, questionId))
  await resolveReports(questionId)
  return { ok: true as const }
}

export async function bulkResolve(questionIds: number[]) {
  await assertAdmin()
  const ids = z.array(z.number().int().positive()).max(100).parse(questionIds)
  if (!ids.length) return
  await db
    .update(questionReports)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(and(inArray(questionReports.questionId, ids), eq(questionReports.status, 'open')))
  refresh()
}
