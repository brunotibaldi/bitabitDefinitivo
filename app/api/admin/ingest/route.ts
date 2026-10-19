import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { processPending, syncCatalog } from '@/lib/ingest/generate'

export const maxDuration = 800

async function expectedTokens() {
  const tokens: string[] = []
  if (process.env.ADMIN_SECRET) tokens.push(process.env.ADMIN_SECRET)
  if (process.env.NODE_ENV === 'development') {
    const local = await readFile(join(process.cwd(), '.v0', 'admin-token'), 'utf8').catch(() => '')
    if (local.trim().length >= 32) tokens.push(local.trim())
  }
  return tokens
}

async function authorized(req: Request) {
  const given = Buffer.from(req.headers.get('x-admin-token') ?? '')
  return (await expectedTokens()).some((t) => {
    const b = Buffer.from(t)
    return b.length === given.length && timingSafeEqual(b, given)
  })
}

export async function POST(req: Request) {
  if (!(await authorized(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'generate'

  if (action === 'sync') return Response.json(await syncCatalog())

  const limit = Math.min(Number(url.searchParams.get('limit') ?? 8), 40)
  const concurrency = Math.min(Number(url.searchParams.get('concurrency') ?? 4), 8)
  return Response.json(await processPending(limit, concurrency))
}
