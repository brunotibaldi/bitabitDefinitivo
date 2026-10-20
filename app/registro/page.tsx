import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { AuthShell } from '@/components/auth-shell'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Crear cuenta — Bit a Bit' }

export default async function RegistroPage() {
  const session = await getSession()
  if (session?.user) redirect('/')
  return (
    <AuthShell
      title="Estudiá de a una pregunta"
      subtitle="Preguntas cortas de exámenes reales, puntos, rachas y un ranking con tus amigos."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  )
}
