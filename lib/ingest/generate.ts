import { generateText, Output } from 'ai'
import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { exams, questions, subjects } from '@/lib/db/schema'
import {
  fetchExams,
  fetchExamText,
  fetchSolutionText,
  fetchSubjects,
  isExcludedSubject,
  shortName,
  SUBJECT_COLORS,
} from './fceia'
import { buildSeedRows } from './seed-extra'

const GENERATOR_MODEL = 'anthropic/claude-sonnet-5.5'
const VERIFIER_MODEL = 'google/gemini-3.5-flash'

export async function syncCatalog() {
  const [apiSubjects, apiExams] = await Promise.all([fetchSubjects(), fetchExams()])
  const subjectInfo = new Map<number, { name: string; year: number | null; term: number | null }>()
  for (const e of apiExams) subjectInfo.set(e.subject_id, { name: e.subject_name, year: null, term: null })
  for (const s of apiSubjects) subjectInfo.set(s.id, { name: s.name, year: s.year, term: s.term })

  const usedSubjects = [...new Set(apiExams.map((e) => e.subject_id))]
  let i = 0
  for (const id of usedSubjects) {
    const { name, year, term } = subjectInfo.get(id) ?? { name: `Materia ${id}`, year: null, term: null }
    if (isExcludedSubject(name)) continue
    await db
      .insert(subjects)
      .values({ id, name, shortName: shortName(name), color: SUBJECT_COLORS[i++ % SUBJECT_COLORS.length], year, term })
      .onConflictDoUpdate({ target: subjects.id, set: { name, shortName: shortName(name), year, term } })
  }

  let inserted = 0
  for (const e of apiExams) {
    if (!e.has_text || isExcludedSubject(e.subject_name)) continue
    const r = await db
      .insert(exams)
      .values({ id: e.id, subjectId: e.subject_id, category: e.category, examDate: e.date })
      .onConflictDoNothing()
      .returning({ id: exams.id })
    inserted += r.length
    if (e.has_solution && e.solution_id) {
      await db.update(exams).set({ solutionText: sql`coalesce(${exams.solutionText}, '__pending:' || ${e.solution_id})` }).where(eq(exams.id, e.id))
    }
  }
  return { subjects: usedSubjects.length, examsInserted: inserted }
}

const generatedSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(['mcq', 'true_false']),
        prompt: z.string().describe('Enunciado corto, máximo 220 caracteres. Puede usar LaTeX entre $...$'),
        options: z.array(z.string()).min(2).max(4).describe('Opciones cortas, máx 80 caracteres. Para true_false: ["Verdadero","Falso"]'),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().describe('Explicación breve de por qué es correcta, máx 400 caracteres'),
        difficulty: z.number().int().min(1).max(3),
        topic: z.string().describe('Tema puntual, 1 a 4 palabras'),
      }),
    )
    .max(6),
})

const verifySchema = z.object({
  answers: z.array(
    z.object({
      index: z.number().int().describe('Número de la pregunta (empezando en 0)'),
      chosen: z.number().int().describe('Índice de la opción correcta según vos'),
      ambiguous: z.boolean().describe('true si hay más de una opción defendible, falta información o el enunciado es confuso'),
    }),
  ),
})

const GEN_SYSTEM = `Sos docente de la Licenciatura en Ciencias de la Computación (FCEIA, UNR).
Transformás exámenes largos en micro-preguntas para una app de estudio estilo "scroll" (como Reels).
Reglas estrictas:
- Generá entre 3 y 6 preguntas basadas en los conceptos y ejercicios del examen.
- Cada una se resuelve mentalmente en menos de 30 segundos. Un solo concepto por pregunta.
- Nada de "según la figura": la pregunta debe ser autocontenida.
- Opción múltiple con 3 o 4 opciones (distractores plausibles, errores típicos) o Verdadero/Falso.
- Exactamente una respuesta correcta, sin ambigüedad. Resolvé vos cada ejercicio con cuidado.
- Usá LaTeX inline con $...$ para fórmulas. Nunca $$.
- Español rioplatense neutro, tono claro y directo. Variá la posición de la respuesta correcta.
- Dificultad: 1 = definición/recordar, 2 = aplicar, 3 = razonar.`

async function verifyQuestions(qs: z.infer<typeof generatedSchema>['questions']) {
  const listing = qs
    .map((q, i) => `Pregunta ${i}: ${q.prompt}\n${q.options.map((o, j) => `  [${j}] ${o}`).join('\n')}`)
    .join('\n\n')
  const { output } = await generateText({
    model: VERIFIER_MODEL,
    output: Output.object({ schema: verifySchema }),
    prompt: `Resolvé cada pregunta de Ciencias de la Computación / Matemática. Para cada una indicá el índice de la opción correcta y si es ambigua.\n\n${listing}`,
  })
  return output.answers
}

export async function processExam(examId: number) {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId))
  if (!exam) return { examId, approved: 0, rejected: 0 }

  let text = exam.text
  if (!text) {
    text = await fetchExamText(examId)
    await db.update(exams).set({ text }).where(eq(exams.id, examId))
  }
  let solution = exam.solutionText
  if (solution?.startsWith('__pending:')) {
    solution = await fetchSolutionText(Number(solution.split(':')[1])).catch(() => null)
    await db.update(exams).set({ solutionText: solution }).where(eq(exams.id, examId))
  }
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, exam.subjectId))

  const { output } = await generateText({
    model: GENERATOR_MODEL,
    system: GEN_SYSTEM,
    output: Output.object({ schema: generatedSchema }),
    prompt: `Materia: ${subject?.name ?? 'desconocida'}\nTipo: ${exam.category ?? ''}\n\nENUNCIADO DEL EXAMEN:\n${text.slice(0, 14000)}${
      solution ? `\n\nRESOLUCIÓN OFICIAL (usala como referencia):\n${solution.slice(0, 10000)}` : ''
    }`,
  })

  const candidates = output.questions.filter(
    (q) =>
      q.correctIndex < q.options.length &&
      q.prompt.length <= 320 &&
      q.options.every((o) => o.length <= 120) &&
      new Set(q.options).size === q.options.length,
  )

  let verdicts: Awaited<ReturnType<typeof verifyQuestions>> = []
  try {
    verdicts = candidates.length ? await verifyQuestions(candidates) : []
  } catch (err) {
    console.error('[ingest] verify failed', examId, err)
  }

  let approved = 0
  let rejected = 0
  for (const [i, q] of candidates.entries()) {
    const v = verdicts.find((x) => x.index === i)
    const ok = v ? !v.ambiguous && v.chosen === q.correctIndex : false
    ok ? approved++ : rejected++
    await db.insert(questions).values({
      examId,
      subjectId: exam.subjectId,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic,
      status: ok ? 'approved' : 'rejected',
    })
  }

  await db.update(exams).set({ processedAt: new Date() }).where(eq(exams.id, examId))
  return { examId, approved, rejected }
}

export async function seedQuestions() {
  const { SEED_QUESTIONS } = await import('./seed-questions')
  const [{ existing }] = await db
    .select({ existing: sql<number>`count(*)::int` })
    .from(questions)
    .where(isNull(questions.examId))
  if (existing > 0) return { inserted: 0, skipped: existing }
  const rows = buildSeedRows(SEED_QUESTIONS)
  await db.insert(questions).values(rows.map((r) => ({ ...r, status: 'approved' as const })))
  return { inserted: rows.length }
}

export async function processPending(limit: number, concurrency = 4) {
  const pending = await db
    .select({ id: exams.id })
    .from(exams)
    .where(and(isNull(exams.processedAt)))
    .orderBy(sql`random()`)
    .limit(limit)

  const results: { examId: number; approved: number; rejected: number; error?: string }[] = []
  const queue = [...pending]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const next = queue.shift()!
        try {
          results.push(await processExam(next.id))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[ingest] exam failed', next.id, message)
          results.push({ examId: next.id, approved: 0, rejected: 0, error: message })
        }
      }
    }),
  )
  const [{ remaining }] = await db
    .select({ remaining: sql<number>`count(*)::int` })
    .from(exams)
    .where(isNull(exams.processedAt))
  return { processed: results.length, remaining, results }
}
