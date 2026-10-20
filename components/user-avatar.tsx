import { cn } from '@/lib/utils'

const COLORS: Record<string, string> = {
  emerald: 'oklch(0.78 0.14 160)',
  sky: 'oklch(0.78 0.12 230)',
  amber: 'oklch(0.82 0.14 80)',
  rose: 'oklch(0.75 0.15 10)',
  violet: 'oklch(0.74 0.13 295)',
  teal: 'oklch(0.78 0.11 190)',
  orange: 'oklch(0.77 0.15 50)',
  lime: 'oklch(0.85 0.16 125)',
}

export function subjectColor(name: string) {
  return COLORS[name] ?? COLORS.emerald
}

export function UserAvatar({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-background',
        className,
      )}
      style={{ backgroundColor: subjectColor(color) }}
    >
      {initials || '?'}
    </span>
  )
}
