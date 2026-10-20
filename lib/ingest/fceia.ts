const BASE = 'https://fceia-api.ariloc.ar/api/v1'
export const LCC_CAREER_ID = 1

type Page<T> = { items: T[]; total: number; limit: number; offset: number }

export type FceiaSubject = { id: number; name: string; code: string }
export type FceiaExam = {
  id: number
  subject_id: number
  subject_name: string
  category: string | null
  date: string | null
  has_text: boolean
  has_solution: boolean
  solution_id: number | null
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`FCEIA ${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function getAll<T>(path: string): Promise<T[]> {
  const out: T[] = []
  const limit = 100
  for (let offset = 0; ; offset += limit) {
    const sep = path.includes('?') ? '&' : '?'
    const page = await get<Page<T>>(`${path}${sep}limit=${limit}&offset=${offset}`)
    out.push(...page.items)
    if (out.length >= page.total || page.items.length === 0) break
  }
  return out
}

export const fetchSubjects = () => getAll<FceiaSubject>(`/subjects?career_id=${LCC_CAREER_ID}`)
export const fetchExams = () => getAll<FceiaExam>(`/exams?career_id=${LCC_CAREER_ID}`)

export async function fetchExamText(id: number) {
  const r = await get<{ text: string }>(`/exams/${id}/text`)
  return r.text
}

export async function fetchSolutionText(id: number) {
  const r = await get<{ text: string }>(`/solutions/${id}/text`)
  return r.text
}

export function isExcludedSubject(name: string) {
  return /ingl[eé]s/i.test(name)
}
