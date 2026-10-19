import 'server-only'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  answers,
  dailyComments,
  dailyQuestions,
  friendships,
  profiles,
  questions,
  subjects,
  user,
} from '@/lib/db/schema'
import { addDays, daysBetween, localDate, weekStart } from './dates'
import { effectiveStreak, FEED_ANSWERS_FOR_STREAK } from './rules'

export type PublicQuestion = {
  id: number
  type: 'mcq' | 'true_false'
  prompt: string
  options: string[]
  difficulty: number
  topic: string | null
  subjectName: string
  subjectShort: string
  subjectColor: string
}

const publicQuestionFields = {
  id: questions.id,
  type: questions.type,
  prompt: questions.prompt,
  options: questions.options,
  difficulty: questions.difficulty,
  topic: questions.topic,
  subjectName: subjects.name,
  subjectShort: subjects.shortName,
  subjectColor: subjects.color,
}

export async function getOrCreateDaily(date = localDate()) {
  const existing = await db.select().from(dailyQuestions).where(eq(dailyQuestions.date, date))
  if (!existing.length) {
    const pick = (difficulty?: number) =>
      db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.status, 'approved'),
            difficulty ? eq(questions.difficulty, difficulty) : undefined,
            sql`${questions.id} not in (select question_id from daily_questions)`,
          ),
        )
        .orderBy(sql`random()`)
        .limit(1)
    let [candidate] = await pick(2)
    if (!candidate) [candidate] = await pick()
    if (!candidate) return null
    await db.insert(dailyQuestions).values({ date, questionId: candidate.id }).onConflictDoNothing()
  }
  const [row] = await db
    .select(publicQuestionFields)
    .from(dailyQuestions)
    .innerJoin(questions, eq(questions.id, dailyQuestions.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(eq(dailyQuestions.date, date))
  return (row as PublicQuestion) ?? null
}

export async function getMyAnswer(userId: string, questionId: number) {
  const [row] = await db
    .select({
      selectedIndex: answers.selectedIndex,
      isCorrect: answers.isCorrect,
      points: answers.points,
      correctIndex: questions.correctIndex,
      explanation: questions.explanation,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(and(eq(answers.userId, userId), eq(answers.questionId, questionId)))
  return row ?? null
}

export async function getTodayStats(userId: string) {
  const today = localDate()
  const [row] = await db
    .select({
      points: sql<number>`coalesce(sum(${answers.points}), 0)::int`,
      feedCount: sql<number>`count(*) filter (where not ${answers.isDaily})::int`,
      correct: sql<number>`count(*) filter (where ${answers.isCorrect})::int`,
      total: sql<number>`count(*)::int`,
      dailyDone: sql<boolean>`bool_or(${answers.isDaily})`,
    })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.localDate, today)))
  return {
    points: row?.points ?? 0,
    feedCount: row?.feedCount ?? 0,
    correct: row?.correct ?? 0,
    total: row?.total ?? 0,
    dailyDone: Boolean(row?.dailyDone),
    target: FEED_ANSWERS_FOR_STREAK,
  }
}

export function displayStreak(profile: {
  currentStreak: number
  lastActiveDate: string | null
  streakFreezes: number
}) {
  return effectiveStreak(profile, localDate(), daysBetween)
}

export async function getFeedPage({
  userId,
  subjectIds,
  seed,
  page,
  pageSize = 8,
}: {
  userId: string
  subjectIds: number[]
  seed: string
  page: number
  pageSize?: number
}) {
  const since = new Date(Number(seed.split('-')[0]) || Date.now())
  const rows = await db
    .select(publicQuestionFields)
    .from(questions)
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(
      and(
        eq(questions.status, 'approved'),
        subjectIds.length ? inArray(questions.subjectId, subjectIds) : undefined,
        sql`not exists (select 1 from answers a where a.question_id = ${questions.id} and a.user_id = ${userId} and a.answered_at < ${since.toISOString()})`,
        sql`${questions.id} not in (select question_id from daily_questions where date = ${localDate()})`,
      ),
    )
    .orderBy(sql`md5(${questions.id}::text || ${seed})`)
    .limit(pageSize)
    .offset(page * pageSize)
  return rows as PublicQuestion[]
}

export async function getFriendIds(userId: string) {
  const rows = await db
    .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        sql`(${friendships.requesterId} = ${userId} or ${friendships.addresseeId} = ${userId})`,
      ),
    )
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId))
}

export type LeaderboardRow = {
  userId: string
  username: string
  name: string
  avatarColor: string
  points: number
  streak: number
  lastActiveDate: string | null
  streakFreezes: number
}

export async function getLeaderboard({
  scope,
  period,
  userId,
}: {
  scope: 'friends' | 'global'
  period: 'week' | 'all'
  userId: string
}) {
  const ids = scope === 'friends' ? [userId, ...(await getFriendIds(userId))] : null
  const start = weekStart()

  const pointsExpr =
    period === 'week'
      ? sql<number>`coalesce((select sum(a.points) from answers a where a.user_id = ${profiles.userId} and a.local_date >= ${start}), 0)::int`
      : sql<number>`${profiles.totalPoints}`

  const rows = await db
    .select({
      userId: profiles.userId,
      username: user.username,
      name: user.name,
      avatarColor: profiles.avatarColor,
      points: pointsExpr,
      streak: profiles.currentStreak,
      lastActiveDate: profiles.lastActiveDate,
      streakFreezes: profiles.streakFreezes,
    })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(ids ? inArray(profiles.userId, ids) : undefined)
    .orderBy(desc(pointsExpr), desc(profiles.currentStreak))
    .limit(100)

  return rows.map((r) => ({
    ...r,
    username: r.username ?? '',
    streak: displayStreak({ currentStreak: r.streak, lastActiveDate: r.lastActiveDate, streakFreezes: r.streakFreezes }),
  })) as LeaderboardRow[]
}

export async function getDailyDebate(userId: string, date = localDate()) {
  const daily = await getOrCreateDaily(date)
  if (!daily) return null
  const mine = await getMyAnswer(userId, daily.id)
  const distribution = await db
    .select({ selectedIndex: answers.selectedIndex, count: sql<number>`count(*)::int` })
    .from(answers)
    .where(and(eq(answers.questionId, daily.id), eq(answers.isDaily, true)))
    .groupBy(answers.selectedIndex)
  const comments = mine
    ? await db
        .select({
          id: dailyComments.id,
          body: dailyComments.body,
          createdAt: dailyComments.createdAt,
          username: user.username,
          name: user.name,
          avatarColor: profiles.avatarColor,
          userId: dailyComments.userId,
        })
        .from(dailyComments)
        .innerJoin(user, eq(user.id, dailyComments.userId))
        .leftJoin(profiles, eq(profiles.userId, dailyComments.userId))
        .where(eq(dailyComments.date, date))
        .orderBy(desc(dailyComments.createdAt))
        .limit(200)
    : []
  return { daily, mine, distribution, comments }
}

export async function getProfileStats(targetUserId: string) {
  const bySubject = await db
    .select({
      subjectId: subjects.id,
      name: subjects.shortName,
      color: subjects.color,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${answers.isCorrect})::int`,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .innerJoin(subjects, eq(subjects.id, questions.subjectId))
    .where(eq(answers.userId, targetUserId))
    .groupBy(subjects.id, subjects.shortName, subjects.color)
    .orderBy(desc(sql`count(*)`))

  const from = addDays(localDate(), -83)
  const activity = await db
    .select({ date: answers.localDate, count: sql<number>`count(*)::int` })
    .from(answers)
    .where(and(eq(answers.userId, targetUserId), gte(answers.localDate, from)))
    .groupBy(answers.localDate)

  return { bySubject, activity, from }
}
