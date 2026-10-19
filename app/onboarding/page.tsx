import type { Metadata } from 'next'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions, subjects } from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { SubjectPicker } from '@/components/subject-picker'

export const metadata: Metadata = { title: 'Elegí tus materias — Bitácora' }

export default async function OnboardingPage() {
  const { user, profile } = await requireUser()
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      shortName: subjects.shortName,
      color: subjects.color,
      count: sql<number>`(select count(*) from ${questions} q where q.subject_id = ${subjects.id} and q.status = 'approved')::int`,
    })
    .from(subjects)
    .orderBy(subjects.name)

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-5 py-12">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
          {'Hola, '}
          {user.name.split(' ')[0]}
        </span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">¿Qué estás cursando?</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Elegí las materias que querés repasar. Tu scroll va a mezclar preguntas de esas materias. Podés cambiarlo
          cuando quieras desde tu perfil.
        </p>
      </div>
      <SubjectPicker subjects={rows.filter((s) => s.count > 0)} initial={profile.subjectIds} redirectTo="/" />
    </main>
  )
}
