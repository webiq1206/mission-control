/**
 * Turso async database client for production.
 * Uses @libsql/client when TURSO_DATABASE_URL is set.
 * Entity: Global
 * Author: Kai
 */

import { createClient, type Client, type ResultSet } from '@libsql/client'

let _client: Client | null = null

export function getTursoClient(urlOverride?: string, tokenOverride?: string): Client {
  if (!_client) {
    const url = urlOverride ?? process.env.TURSO_DATABASE_URL
    const authToken = tokenOverride ?? process.env.TURSO_AUTH_TOKEN
    if (!url) throw new Error('TURSO_DATABASE_URL not set')
    _client = createClient({ url, authToken })
  }
  return _client
}

export type Row = Record<string, unknown>

/**
 * Unified async DB interface that mirrors better-sqlite3's synchronous API
 * but returns Promises. All API routes should use this.
 */
export class TursoDb {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  async execute(sql: string, args: unknown[] = []): Promise<ResultSet> {
    return this.client.execute({ sql, args: args as never[] })
  }

  async all<T = Row>(sql: string, ...args: unknown[]): Promise<T[]> {
    const result = await this.client.execute({ sql, args: args as never[] })
    return result.rows.map(row => {
      const obj: Record<string, unknown> = {}
      result.columns.forEach((col, i) => { obj[col] = row[i] })
      return obj as T
    })
  }

  async get<T = Row>(sql: string, ...args: unknown[]): Promise<T | null> {
    const rows = await this.all<T>(sql, ...args)
    return rows[0] ?? null
  }

  async run(sql: string, ...args: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    // Auto-detect named-param style: if called with a single plain object and SQL has @params,
    // convert @name -> ? and extract values in order (matches better-sqlite3 named-param behavior)
    let finalSql = sql
    let finalArgs: unknown[] = args
    if (
      args.length === 1 &&
      args[0] !== null &&
      typeof args[0] === 'object' &&
      !Array.isArray(args[0]) &&
      /@\w+/.test(sql)
    ) {
      const params = args[0] as Record<string, unknown>
      const positional: unknown[] = []
      finalSql = sql.replace(/@(\w+)/g, (_m, name) => {
        const val = params[name]
        positional.push(val === undefined ? null : val)
        return '?'
      })
      finalArgs = positional
    }
    // Null-coerce any remaining undefined values
    const safeArgs = finalArgs.map(a => (a === undefined ? null : a))
    const result = await this.client.execute({ sql: finalSql, args: safeArgs as never[] })
    return {
      changes: result.rowsAffected,
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    }
  }

  /** Executes multiple statements in a batch (DDL) */
  async exec(sql: string): Promise<void> {
    // Split on semicolons, filter empty, execute each
    const stmts = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const batch = stmts.map(s => ({ sql: s, args: [] as never[] }))
    if (batch.length > 0) {
      await this.client.batch(batch, 'write')
    }
  }

  /** Named-parameter style: replaces @name placeholders with positional ? */
  async runNamed(sql: string, params: Record<string, unknown>): Promise<{ changes: number }> {
    // Convert @param style to positional
    const args: unknown[] = []
    const converted = sql.replace(/@(\w+)/g, (_match, name) => {
      args.push(params[name] ?? null)
      return '?'
    })
    const result = await this.client.execute({ sql: converted, args: args as never[] })
    return { changes: result.rowsAffected }
  }
}

let _tursoDb: TursoDb | null = null

export function getTursoDb(urlOverride?: string, tokenOverride?: string): TursoDb {
  if (!_tursoDb) {
    _tursoDb = new TursoDb(getTursoClient(urlOverride, tokenOverride))
  }
  return _tursoDb
}

/** Create a fresh TursoDb instance (bypasses singleton, for Replit local file mode) */
export function createTursoDb(url: string, authToken = ''): TursoDb {
  const client = createClient({ url, authToken })
  return new TursoDb(client)
}
