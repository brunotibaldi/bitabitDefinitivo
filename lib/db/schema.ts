import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('displayUsername'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  avatarColor: text('avatar_color').notNull().default('emerald'),
  subjectIds: integer('subject_ids').array().notNull().default([]),
  onboarded: boolean('onboarded').notNull().default(false),
  totalPoints: integer('total_points').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActiveDate: date('last_active_date'),
  streakFreezes: integer('streak_freezes').notNull().default(0),
  combo: integer('combo').notNull().default(0),
  bestCombo: integer('best_combo').notNull().default(0),
  bits: integer('bits').notNull().default(10),
  role: text('role').$type<'user' | 'admin'>().notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const subjects = pgTable('subjects', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  color: text('color').notNull().default('emerald'),
  year: integer('year'),
  term: integer('term'),
})

export const exams = pgTable('exams', {
  id: integer('id').primaryKey(),
  subjectId: integer('subject_id').notNull(),
  category: text('category'),
  examDate: text('exam_date'),
  text: text('text'),
  solutionText: text('solution_text'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const QUESTION_TYPES = [
  'mcq',
  'true_false',
  'fill_blank',
  'definition',
  'intruder',
  'proof_gap',
  'code_output',
  'order',
  'match',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]
export const SEQUENCE_TYPES: readonly QuestionType[] = ['order', 'match']
export type QuestionStatus = 'approved' | 'rejected' | 'flagged' | 'pending'
export type QuestionContext = {
  term?: string
  code?: string
  lines?: string[]
  left?: string[]
}
export type PowerupKind = 'remove_one' | 'remove_two' | 'first_item'

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  examId: integer('exam_id'),
  subjectId: integer('subject_id').notNull(),
  type: text('type').$type<QuestionType>().notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation').notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  topic: text('topic'),
  hint: text('hint'),
  status: text('status').$type<QuestionStatus>().notNull().default('approved'),
  reportCount: integer('report_count').notNull().default(0),
  context: jsonb('context').$type<QuestionContext>(),
  answerOrder: jsonb('answer_order').$type<number[]>(),
  authorId: text('author_id'),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const questionVotes = pgTable('question_votes', {
  userId: text('user_id').notNull(),
  questionId: integer('question_id').notNull(),
  value: smallint('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const answers = pgTable('answers', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: integer('question_id').notNull(),
  selectedIndex: integer('selected_index').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  points: integer('points').notNull().default(0),
  isDaily: boolean('is_daily').notNull().default(false),
  selectedOrder: jsonb('selected_order').$type<number[]>(),
  hintUsed: boolean('hint_used').notNull().default(false),
  localDate: date('local_date').notNull(),
  answeredAt: timestamp('answered_at').notNull().defaultNow(),
})

export const questionAssists = pgTable('question_assists', {
  userId: text('user_id').notNull(),
  questionId: integer('question_id').notNull(),
  hintUsed: boolean('hint_used').notNull().default(false),
  removed: jsonb('removed').$type<number[]>().notNull().default([]),
  firstRevealed: boolean('first_revealed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const dailyQuestions = pgTable('daily_questions', {
  date: date('date').primaryKey(),
  questionId: integer('question_id').notNull(),
})

export const dailyComments = pgTable('daily_comments', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  userId: text('user_id').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const friendships = pgTable('friendships', {
  id: serial('id').primaryKey(),
  requesterId: text('requester_id').notNull(),
  addresseeId: text('addressee_id').notNull(),
  status: text('status').$type<'pending' | 'accepted'>().notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const questionReports = pgTable('question_reports', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').notNull(),
  userId: text('user_id').notNull(),
  reason: text('reason'),
  category: text('category'),
  message: text('message'),
  status: text('status').$type<'open' | 'resolved'>().notNull().default('open'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
