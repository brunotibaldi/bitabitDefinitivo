import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questionReports, questions, subjects, user } from '@/lib/db/schema'

const adminQuestionFields = {
  id: questions.id,
  subjectId: questions.subjectId,
  subjectShort: subjects.shortName,
  subjectColor: subjects.color,
  type: questions.type,
  prompt: questions.prompt,
  options: questions.options,
  correctIndex: questions.correctIndex,
  answerOrder: questions.answerOrder,
  context: questions.context,
  explanation: questions.explanation,
  difficulty: questions.difficulty,
  topic: questions.topic,
  status: questions.status,
  upvotes: questions.upvotes,
  downvotes: questions.downvotes,
  createdAt: questions.createdAt,
}

export type AdminQuestion = Awaited<ReturnType<typeof getPendingQuestions>>[number]

export async function getPendingQuestions() {
  return db
    .select({ ...adminQuestionFields, authorUsername: user.username, authorName: user.name })
    .from(questions)
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .leftJoin(user, eq(user.id, questions.authorId))
    .where(eq(questions.status, 'pending'))
    .orderBy(asc(questions.createdAt))
    .limit(100)
}

export async function getReportedQuestions() {
  const questionRows = await db
    .select({
      ...adminQuestionFields,
      authorUsername: user.username,
      authorName: user.name,
      openReports: sql<number>`count(${questionReports.id})::int`,
      lastReportAt: sql<Date>`max(${questionReports.createdAt})`,
    })
    .from(questionReports)
    .innerJoin(questions, eq(questions.id, questionReports.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .leftJoin(user, eq(user.id, questions.authorId))
    .where(eq(questionReports.status, 'open'))
    .groupBy(...Object.values(adminQuestionFields), user.username, user.name)
    .orderBy(desc(sql`count(${questionReports.id})`), desc(sql`max(${questionReports.createdAt})`))
    .limit(100)

  if (!questionRows.length) return []
  const reports = await db
    .select({
      questionId: questionReports.questionId,
      category: questionReports.category,
      message: questionReports.message,
      createdAt: questionReports.createdAt,
      username: user.username,
    })
    .from(questionReports)
    .innerJoin(user, eq(user.id, questionReports.userId))
    .where(and(eq(questionReports.status, 'open')))
    .orderBy(desc(questionReports.createdAt))

  return questionRows.map((q) => ({ ...q, reports: reports.filter((r) => r.questionId === q.id) }))
}

export async function getAdminCounts() {
  const [row] = await db
    .select({
      pending: sql<number>`(select count(*) from questions where status = 'pending')::int`,
      reported: sql<number>`(select count(distinct question_id) from question_reports where status = 'open')::int`,
      total: sql<number>`(select count(*) from questions where status = 'approved')::int`,
    })
    .from(sql`(select 1) as one`)
  return row
}

export async function getSubjectOptions() {
  return db
    .select({ id: subjects.id, name: subjects.name, shortName: subjects.shortName, color: subjects.color })
    .from(subjects)
    .orderBy(asc(subjects.name))
}
