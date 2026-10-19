import type { Metadata } from 'next'
import { sql } from 'drizzle-orm'
import { Flame, Snowflake, Trophy } from 'lucide-react'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import { SignOutButton } from '@/components/sign-out-button'
import { SubjectPicker } from '@/components/subject-picker'
import { UserAvatar, subjectColor } from '@/components/user-avatar'
import { db } from '@/lib/db'
import { questions, subjects } from '@/lib/db/schema'
import { displayStreak, getProfileStats } from '@/lib/game/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Perfil — Bit a Bit' }
export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const { user, profile } = await requireUser()
  const [stats, allSubjects] = await Promise.all([
    getProfileStats(profile.userId),
    db
      .select({
        id: subjects.id,
        name: subjects.name,
        shortName: subjects.shortName,
        color: subjects.color,
        count: sql<number>`(select count(*) from ${questions} q where q.subject_id = ${subjects.id} and q.status = 'approved')::int`,
      })
      .from(subjects)
      .orderBy(subjects.name),
  ])
  const streak = displayStreak(profile)
  const totalAnswers = stats.bySubject.reduce((a, s) => a + s.total, 0)
  const totalCorrect = stats.bySubject.reduce((a, s) => a + s.correct, 0)
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-6 md:py-10">
      <header className="flex items-center gap-4">
        <UserAvatar name={user.name} color={profile.avatarColor} className="size-16 text-lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
          <span className="truncate font-mono text-sm text-muted-foreground">@{user.username}</span>
        </div>
        <SignOutButton />
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Puntos" value={profile.totalPoints.toLocaleString('es-AR')} icon={<Trophy className="size-4 text-primary" />} />
        <Stat label="Racha" value={`${streak} d`} icon={<Flame className="size-4 text-streak" />} />
        <Stat label="Mejor racha" value={`${profile.longestStreak} d`} icon={<Flame className="size-4 text-muted-foreground" />} />
        <Stat label="Protectores" value={String(profile.streakFreezes)} icon={<Snowflake className="size-4 text-sky-300" />} />
      </dl>

      <section className="flex flex-col gap-4" aria-labelledby="act-title">
        <h2 id="act-title" className="text-sm font-semibold">Últimas 12 semanas</h2>
        <ActivityHeatmap from={stats.from} activity={stats.activity} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Respondé al menos 5 preguntas por día para sostener la racha. Cada 7 días seguidos ganás un protector que
          salva tu racha si un día no podés entrar.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="acc-title">
        <h2 id="acc-title" className="flex items-baseline justify-between text-sm font-semibold">
          Precisión por materia
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {accuracy}% global · {totalAnswers} respuestas
          </span>
        </h2>
        {stats.bySubject.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
            Todavía no respondiste preguntas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.bySubject.map((s) => {
              const pct = Math.round((s.correct / s.total) * 100)
              return (
                <li key={s.subjectId} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.correct}/{s.total} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: subjectColor(s.color) }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="subj-title">
        <h2 id="subj-title" className="text-sm font-semibold">Mis materias</h2>
        <SubjectPicker subjects={allSubjects.filter((s) => s.count > 0)} initial={profile.subjectIds} />
      </section>
    </main>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="font-mono text-xl font-semibold">{value}</dd>
    </div>
  )
}
