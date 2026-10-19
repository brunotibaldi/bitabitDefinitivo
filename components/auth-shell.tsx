import { Logo, LogoMark } from './logo'

const DEMO = [
  { label: 'O(n log n)', color: 'bg-game-red' },
  { label: 'O(n²)', color: 'bg-game-blue' },
  { label: 'O(n)', color: 'bg-game-yellow' },
  { label: 'O(log n)', color: 'bg-game-green' },
]

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden lg:flex-row">
      <section className="relative hidden flex-1 flex-col justify-between border-r-3 border-ink bg-card p-10 lg:flex">
        <Logo href="/login" />
        <div className="flex flex-col gap-6">
          <p className="font-pixel text-[10px] text-muted-foreground">{'> MERGESORT EN EL PEOR CASO ES…'}</p>
          <div className="grid max-w-md grid-cols-2 gap-3">
            {DEMO.map((d, i) => (
              <div
                key={d.label}
                className={`pixel-btn flex h-20 animate-pop-in items-center justify-center font-pixel text-sm text-ink ${d.color} ${i === 0 ? 'outline-4 outline-offset-2 outline-foreground' : 'opacity-40'}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {d.label}
              </div>
            ))}
          </div>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            Preguntas cortas de los exámenes de Cs. de la Computación. Sumá puntos, mantené la racha y ganale a tus amigos.
          </p>
        </div>
        <div className="flex items-center gap-3 font-pixel text-[9px] text-muted-foreground">
          <span className="animate-blink text-primary">{'▶'}</span> INSERT COIN TO CONTINUE
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-10">
        <div className="flex flex-col items-center gap-4 lg:hidden">
          <LogoMark className="size-16 animate-bob" />
          <span className="font-pixel text-base text-primary text-shadow-pixel">BIT A BIT</span>
        </div>
        <div className="pixel-box flex w-full max-w-sm animate-pop-in flex-col gap-6 bg-card p-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-pixel text-sm leading-relaxed text-primary">{title}</h1>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
