'use client'

import { useState, useTransition } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { voteQuestion } from '@/app/actions/game'
import { sfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

export function VoteBar({
  questionId,
  upvotes,
  downvotes,
  myVote,
}: {
  questionId: number
  upvotes: number
  downvotes: number
  myVote: number
}) {
  const [state, setState] = useState({ upvotes, downvotes, myVote })
  const [bump, setBump] = useState(0)
  const [, startTransition] = useTransition()

  function vote(value: 1 | -1) {
    const next = (state.myVote === value ? 0 : value) as -1 | 0 | 1
    sfx.vote(value === 1)
    setBump((b) => b + 1)
    setState((s) => ({
      myVote: next,
      upvotes: s.upvotes + (next === 1 ? 1 : 0) - (s.myVote === 1 ? 1 : 0),
      downvotes: s.downvotes + (next === -1 ? 1 : 0) - (s.myVote === -1 ? 1 : 0),
    }))
    startTransition(async () => {
      const res = await voteQuestion(questionId, next)
      if (res) setState(res)
    })
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Calificar pregunta">
      <button
        type="button"
        onClick={() => vote(1)}
        aria-pressed={state.myVote === 1}
        aria-label={`Buena pregunta, ${state.upvotes} votos`}
        className={cn(
          'flex items-center gap-1.5 border-3 border-ink px-2 py-1 text-xs font-bold tabular-nums transition-colors',
          state.myVote === 1 ? 'bg-game-green text-ink' : 'bg-secondary text-muted-foreground hover:text-game-green',
        )}
      >
        <ThumbsUp key={state.myVote === 1 ? `u${bump}` : 'u'} className={cn('size-3.5', state.myVote === 1 && 'animate-pop-in')} />
        {state.upvotes}
      </button>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-pressed={state.myVote === -1}
        aria-label={`Mala pregunta, ${state.downvotes} votos`}
        className={cn(
          'flex items-center gap-1.5 border-3 border-ink px-2 py-1 text-xs font-bold tabular-nums transition-colors',
          state.myVote === -1 ? 'bg-game-red text-ink' : 'bg-secondary text-muted-foreground hover:text-game-red',
        )}
      >
        <ThumbsDown key={state.myVote === -1 ? `d${bump}` : 'd'} className={cn('size-3.5', state.myVote === -1 && 'animate-pop-in')} />
        {state.downvotes}
      </button>
    </div>
  )
}
