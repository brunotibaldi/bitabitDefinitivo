'use client'

import { useState, useTransition } from 'react'
import useSWR from 'swr'
import { Check, Loader2, Search, UserMinus, UserPlus, X } from 'lucide-react'
import { removeFriend, respondFriendRequest, searchUsers, sendFriendRequest } from '@/app/actions/friends'
import { Button } from '@/components/ui/button'
import { useDebounced } from '@/hooks/use-debounced'
import { UserAvatar } from './user-avatar'

export function FriendSearch() {
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query.trim().toLowerCase(), 250)
  const { data, isLoading, mutate } = useSWR(debounced.length >= 2 ? ['users', debounced] : null, ([, q]) =>
    searchUsers(q),
  )
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="friend-search" className="sr-only">
        Buscar por usuario
      </label>
      <div className="flex h-12 items-center gap-3 rounded-2xl border bg-card px-4 focus-within:border-primary/50">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="friend-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar @usuario"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>

      {debounced.length >= 2 && data && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {data.length === 0 && <li className="px-1 text-sm text-muted-foreground">Nadie con ese usuario.</li>}
          {data.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
              <UserAvatar name={u.name} color={u.avatarColor} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{u.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">@{u.username}</span>
              </div>
              {u.relation === 'friends' ? (
                <span className="text-xs text-primary">Amigos</span>
              ) : u.relation === 'sent' ? (
                <span className="text-xs text-muted-foreground">Enviada</span>
              ) : (
                <Button
                  size="sm"
                  disabled={isPending}
                  className="rounded-lg"
                  onClick={() =>
                    startTransition(async () => {
                      await sendFriendRequest(u.id)
                      await mutate()
                    })
                  }
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  {u.relation === 'received' ? 'Aceptar' : 'Agregar'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function RequestActions({ requesterId }: { requesterId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <div className="flex gap-2">
      <Button
        size="icon-sm"
        disabled={isPending}
        aria-label="Aceptar solicitud"
        onClick={() => startTransition(() => respondFriendRequest(requesterId, true))}
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        disabled={isPending}
        aria-label="Rechazar solicitud"
        onClick={() => startTransition(() => respondFriendRequest(requesterId, false))}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function FriendActions({ otherId, name }: { otherId: string; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  if (confirming)
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => removeFriend(otherId))}
        >
          Quitar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    )
  return (
    <Button size="icon-sm" variant="ghost" aria-label={`Quitar a ${name}`} onClick={() => setConfirming(true)}>
      <UserMinus className="size-4" />
    </Button>
  )
}
