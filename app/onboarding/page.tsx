import type { Metadata } from 'next'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions, subjects } from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { SubjectPicker } from '@/components/subject-picker'

export const metadata: Metadata = { title: 'Elegí tus materias — Bit a Bit' }

export default async function OnboardingPage() {
  const { user, profile } = await requireUser()
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      shortName: subjects.shortName,
      color: subjects.color,
      year: subjects.year,
      term: subjects.term,
      count: sql<number>`(select count(*) from ${questions} q where q.subject_id = ${subjects.id} and q.status = 'approved')::int`,
    })
    .from(subjects)
    .orderBy(subjects.name)

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 sm:px-5">
      <div className="flex flex-col gap-3">
        <span className="font-pixel text-[10px] text-primary">
          {'PLAYER 1: '}
          {user.name.split(' ')[0].toUpperCase()}
        </span>
        <h1 className="text-balance font-pixel text-lg leading-relaxed sm:text-2xl">ELEGÍ TU MUNDO</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Abrí cada año y marcá las materias que querés repasar. Tu scroll va a mezclar preguntas de esas materias.
          Podés cambiarlo cuando quieras desde tu perfil.
        </p>
      </div>
      <SubjectPicker subjects={rows.filter((s) => s.count > 0)} initial={profile.subjectIds} redirectTo="/" />
    </main>
  )
}
