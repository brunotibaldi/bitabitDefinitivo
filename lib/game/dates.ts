const TZ = 'America/Argentina/Buenos_Aires'

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function localDate(d: Date = new Date()) {
  return fmt.format(d)
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000,
  )
}

export function weekStart(iso: string = localDate()) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return addDays(iso, -((day + 6) % 7))
}

export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
}
