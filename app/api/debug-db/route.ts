import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const vars = [
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'PGHOST',
    'PGDATABASE',
    'PGUSER',
  ]

  const result: Record<string, string> = {}
  for (const v of vars) {
    const val = process.env[v]
    if (!val) {
      result[v] = '(not set)'
    } else {
      try {
        const parsed = new URL(val)
        result[v] = `host=${parsed.hostname} | pgbouncer=${parsed.searchParams.get('pgbouncer') ?? 'no'}`
      } catch {
        result[v] = '(set but unparseable)'
      }
    }
  }

  return NextResponse.json(result)
}
