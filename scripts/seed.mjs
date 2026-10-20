import pg from 'pg'
import { SEED_QUESTIONS } from '../lib/ingest/seed-questions.ts'
import { buildSeedRows } from '../lib/ingest/seed-extra.ts'
import { fetchSubjects, isExcludedSubject, shortName, SUBJECT_COLORS } from '../lib/ingest/fceia.ts'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const apiSubjects = (await fetchSubjects())
  .filter((s) => !isExcludedSubject(s.name))
  .sort((a, b) => (a.year ?? 99) - (b.year ?? 99) || (a.term ?? 0) - (b.term ?? 0) || a.id - b.id)

for (const [i, s] of apiSubjects.entries()) {
  await client.query(
    `insert into subjects (id, name, short_name, color, year, term) values ($1,$2,$3,$4,$5,$6)
     on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, year = excluded.year, term = excluded.term`,
    [s.id, s.name, shortName(s.name), SUBJECT_COLORS[i % SUBJECT_COLORS.length], s.year, s.term],
  )
}
console.log(`subjects: ${apiSubjects.length}`)

const { rows: [{ existing }] } = await client.query('select count(*)::int as existing from questions where exam_id is null')
if (existing > 0) {
  console.log(`questions: skipped (${existing} seed questions already present)`)
} else {
  const rows = buildSeedRows(SEED_QUESTIONS)
  for (const r of rows) {
    await client.query(
      `insert into questions (subject_id, type, prompt, options, correct_index, explanation, difficulty, topic, hint, context, answer_order, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'approved')`,
      [
        r.subjectId,
        r.type,
        r.prompt,
        JSON.stringify(r.options),
        r.correctIndex,
        r.explanation,
        r.difficulty,
        r.topic,
        r.hint,
        r.context ? JSON.stringify(r.context) : null,
        r.answerOrder ? JSON.stringify(r.answerOrder) : null,
      ],
    )
  }
  console.log(`questions: ${rows.length} (${rows.filter((r) => r.hint).length} with hint)`)
}

await client.end()
