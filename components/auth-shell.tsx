import { Check } from 'lucide-react'
import { MathText } from './math-text'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-2 font-mono text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
              {'>_'}
            </span>
            bitácora
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-pretty leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>

      <aside className="hidden flex-col justify-center gap-6 border-l bg-card/40 px-12 lg:flex" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-md -rotate-2 flex-col gap-4 rounded-3xl border bg-card p-6 shadow-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            Estructuras de Datos / complejidad
          </span>
          <p className="text-xl font-semibold leading-snug">
            <MathText text="¿Cuál es la complejidad de buscar en un árbol AVL con $n$ nodos?" />
          </p>
          <div className="grid gap-2">
            {['$O(n)$', '$O(\\log n)$', '$O(n \\log n)$'].map((o, i) => (
              <div
                key={o}
                className={
                  i === 1
                    ? 'flex items-center gap-3 rounded-2xl border border-primary bg-primary/15 px-4 py-3'
                    : 'flex items-center gap-3 rounded-2xl border bg-secondary/60 px-4 py-3 opacity-50'
                }
              >
                <span
                  className={
                    i === 1
                      ? 'flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground'
                      : 'flex size-7 items-center justify-center rounded-lg border font-mono text-xs'
                  }
                >
                  {i === 1 ? <Check className="size-4" /> : 'ABC'[i]}
                </span>
                <MathText text={o} />
              </div>
            ))}
          </div>
          <span className="font-mono text-sm font-semibold text-primary">+15 pts</span>
        </div>
        <div className="mx-auto flex w-full max-w-md rotate-1 items-center justify-between rounded-2xl border border-streak/30 bg-streak/10 px-5 py-4">
          <span className="text-sm font-medium">Racha actual</span>
          <span className="font-mono text-2xl font-semibold text-streak">12 días</span>
        </div>
        <p className="mx-auto max-w-md text-pretty text-center text-sm leading-relaxed text-muted-foreground">
          Preguntas cortas armadas a partir de exámenes reales de la Lic. en Ciencias de la Computación (FCEIA).
        </p>
      </aside>
    </main>
  )
}
