'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, Send, Trash2 } from 'lucide-react'
import { deleteDailyComment, postDailyComment } from '@/app/actions/game'
import { Button } from '@/components/ui/button'
import { MathText } from './math-text'
import { UserAvatar } from './user-avatar'

type Comment = {
  id: number
  body: string
  createdAt: string
  username: string
  name: string
  avatarColor: string
  userId: string
}

const timeFmt = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
})

export function DailyComments({ comments, meId }: { comments: Comment[]; meId: string }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!body.trim() || isPending) return
    startTransition(async () => {
      const res = await postDailyComment(body)
      if (!res.ok) setError(res.error ?? 'No se pudo publicar')
      else {
        setBody('')
        setError(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor="comment" className="sr-only">
          Tu comentario
        </label>
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:border-primary/50">
          <textarea
            id="comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            maxLength={500}
            placeholder="¿Por qué elegiste esa respuesta? Podés usar $LaTeX$."
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" disabled={isPending || !body.trim()} aria-label="Publicar comentario">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nadie comentó todavía. Abrí el debate.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl border bg-card p-4">
              <UserAvatar name={c.name} color={c.avatarColor} className="size-8" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">@{c.username}</span>
                  <time className="ml-auto shrink-0 font-mono text-xs text-muted-foreground" dateTime={c.createdAt}>
                    {timeFmt.format(new Date(c.createdAt))}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  <MathText text={c.body} />
                </p>
              </div>
              {c.userId === meId && (
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteDailyComment(c.id))}
                  className="self-start rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label="Borrar comentario"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
