import type { QuestionContext as Ctx, QuestionType } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { MathText } from '../math-text'

export function BlankPrompt({ prompt, filled }: { prompt: string; filled?: string | null }) {
  const parts = prompt.split('___')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          <MathText text={part} />
          {i < parts.length - 1 &&
            (filled ? (
              <span className="mx-1 inline-block animate-pop-in border-b-4 border-game-green bg-game-green/15 px-2 text-game-green">
                <MathText text={filled} />
              </span>
            ) : (
              <span className="mx-1 inline-flex min-w-16 items-end border-b-4 border-dashed border-primary px-2 align-baseline">
                <span className="mb-1 inline-block h-4 w-2.5 animate-blink bg-primary" aria-hidden="true" />
                <span className="sr-only">espacio en blanco</span>
              </span>
            ))}
        </span>
      ))}
    </>
  )
}

export function QuestionContextView({
  type,
  context,
  filled,
}: {
  type: QuestionType
  context: Ctx | null
  filled?: string | null
}) {
  if (!context) return null

  if (type === 'definition' && context.term) {
    return (
      <div className="flex flex-col items-center gap-2 border-3 border-dashed border-game-blue/60 bg-game-blue/10 px-4 py-5 text-center">
        <span className="font-pixel text-[10px] text-game-blue">TÉRMINO</span>
        <span className="text-balance text-2xl font-bold">
          <MathText text={context.term} />
        </span>
      </div>
    )
  }

  if (type === 'code_output' && context.code) {
    const lines = context.code.replace(/\n+$/, '').split('\n')
    return (
      <div className="overflow-hidden border-3 border-ink bg-ink">
        <div className="flex items-center gap-1.5 border-b-3 border-ink bg-secondary px-3 py-1.5">
          <span className="size-2.5 bg-game-red" />
          <span className="size-2.5 bg-game-yellow" />
          <span className="size-2.5 bg-game-green" />
          <span className="ml-2 font-pixel text-[8px] text-muted-foreground">main</span>
        </div>
        <pre className="no-scrollbar overflow-x-auto p-3 text-sm leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <span key={i} className="flex gap-3">
                <span className="w-4 shrink-0 select-none text-right text-muted-foreground/60">{i + 1}</span>
                <span className="text-game-green">{line || ' '}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    )
  }

  if (type === 'proof_gap' && context.lines?.length) {
    return (
      <ol className="flex flex-col border-3 border-ink bg-ink/50">
        {context.lines.map((line, i) => {
          const gap = line.includes('???')
          return (
            <li
              key={i}
              className={cn(
                'flex items-start gap-3 border-b-2 border-ink px-3 py-2 text-sm leading-relaxed last:border-b-0',
                gap && 'bg-primary/10',
              )}
            >
              <span className={cn('font-pixel text-[9px] leading-6', gap ? 'text-primary' : 'text-muted-foreground')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                {gap ? (
                  filled ? (
                    <span className="animate-pop-in text-game-green">
                      <MathText text={line.replace('???', filled)} />
                    </span>
                  ) : (
                    <BlankPrompt prompt={line.replace('???', '___')} />
                  )
                ) : (
                  <MathText text={line} />
                )}
              </span>
            </li>
          )
        })}
      </ol>
    )
  }

  return null
}
