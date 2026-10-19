import katex from 'katex'
import { cn } from '@/lib/utils'

const TOKEN = /(\$[^$]+\$|`[^`]+`)/g

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN).filter(Boolean)
  return (
    <span className={cn('[overflow-wrap:anywhere]', className)}>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const html = katex.renderToString(part.slice(1, -1), { throwOnError: false, output: 'html' })
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={i} className="rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[0.9em]">
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
