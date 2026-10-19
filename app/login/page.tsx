import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { AuthShell } from '@/components/auth-shell'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Entrar — Bitácora' }

export default async function LoginPage() {
  const session = await getSession()
  if (session?.user) redirect('/')
  return (
    <AuthShell title="Volvé a tu racha" subtitle="Unas preguntas por día y llegás al final con todo repasado.">
      <AuthForm mode="sign-in" />
    </AuthShell>
  )
}
