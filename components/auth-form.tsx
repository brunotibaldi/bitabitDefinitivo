'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Mode = 'sign-in' | 'sign-up'

const inputClass =
  'h-12 w-full rounded-xl border bg-secondary/60 px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-3 focus:ring-ring/30'

function Field({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    try {
      if (isSignUp) {
        const name = String(form.get('name') ?? '').trim()
        const username = String(form.get('username') ?? '').trim().toLowerCase()
        if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
          setError('El usuario debe tener 3 a 20 caracteres: letras, números, "_" o "."')
          return
        }
        const { error } = await authClient.signUp.email({ email, password, name, username })
        if (error) {
          console.log('[v0] sign-up error:', error)
          setError(
            error.code === 'USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER' || error.code === 'USERNAME_IS_ALREADY_TAKEN'
              ? 'Ese nombre de usuario ya está en uso.'
              : 'No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.',
          )
          return
        }
        router.push('/onboarding')
      } else {
        const { error } = email.includes('@')
          ? await authClient.signIn.email({ email, password })
          : await authClient.signIn.username({ username: email.toLowerCase(), password })
        if (error) {
          setError('Usuario o contraseña incorrectos.')
          return
        }
        router.push('/')
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {isSignUp && (
        <>
          <Field id="name" label="Nombre" autoComplete="name" required maxLength={60} placeholder="Ada Lovelace" />
          <Field
            id="username"
            label="Usuario"
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            placeholder="ada"
            hint="Tus amigos te van a buscar por este nombre."
            autoCapitalize="none"
            spellCheck={false}
          />
        </>
      )}
      <Field id="email" label="Email" type="email" autoComplete="email" required placeholder="ada@fceia.unr.edu.ar" />
      <Field
        id="password"
        label="Contraseña"
        type="password"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        required
        minLength={8}
        placeholder="Mínimo 8 caracteres"
      />

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className={cn('h-12 rounded-xl text-base font-semibold')}>
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {isSignUp ? 'Crear cuenta' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? '¿Ya tenés cuenta? ' : '¿Primera vez? '}
        <Link href={isSignUp ? '/login' : '/registro'} className="font-medium text-primary hover:underline">
          {isSignUp ? 'Entrá' : 'Creá tu cuenta'}
        </Link>
      </p>
    </form>
  )
}
