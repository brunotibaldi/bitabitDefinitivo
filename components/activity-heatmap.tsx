import { addDays } from '@/lib/game/dates'
import { FEED_ANSWERS_FOR_STREAK as DAILY_GOAL } from '@/lib/game/rules'
import { cn } from '@/lib/utils'

export function ActivityHeatmap({ from, activity }: { from: string; activity: { date: string; count: number }[] }) {
  const counts = new Map(activity.map((a) => [a.date, a.count]))
  const days = Array.from({ length: 84 }, (_, i) => addDays(from, i))
  const weeks = Array.from({ length: 12 }, (_, w) => days.slice(w * 7, w * 7 + 7))

  function level(count: number) {
    if (count === 0) return 'bg-secondary'
    if (count < DAILY_GOAL) return 'bg-primary/30'
    if (count < DAILY_GOAL * 3) return 'bg-primary/65'
    return 'bg-primary'
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto" role="img" aria-label={`Actividad: ${activity.length} días activos en las últimas 12 semanas`}>
      {weeks.map((week, w) => (
        <div key={w} className="flex flex-1 flex-col gap-1.5">
          {week.map((d) => {
            const c = counts.get(d) ?? 0
            return (
              <div
                key={d}
                title={`${d}: ${c} respuestas`}
                className={cn('aspect-square min-w-3 rounded-[3px]', level(c))}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
