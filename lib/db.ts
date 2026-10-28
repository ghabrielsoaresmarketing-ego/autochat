import fs from "node:fs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

interface Driver {
  kind: "postgres" | "pglite";
  query(text: string, params?: unknown[]): Promise<Row[]>;
}

const g = globalThis as unknown as { __autodmDb?: Promise<Driver> };

export class DbConfigError extends Error {}

function connectionString(): string | null {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return null;
  // O Neon coloca channel_binding na URL e o driver não aceita: removemos.
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return raw.replace(/([?&])channel_binding=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY DEFAULT 1,
    ig_user_id TEXT,
    app_scoped_id TEXT,
    username TEXT,
    name TEXT,
    picture TEXT,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    refreshed_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Nova automação',
    active BOOLEAN NOT NULL DEFAULT true,
    media_id TEXT,
    media_permalink TEXT,
    media_thumb TEXT,
    media_caption TEXT,
    keywords TEXT NOT NULL DEFAULT '',
    match_any BOOLEAN NOT NULL DEFAULT false,
    public_replies TEXT NOT NULL DEFAULT '',
    opening_text TEXT NOT NULL DEFAULT '',
    opening_button TEXT NOT NULL DEFAULT '',
    require_follow BOOLEAN NOT NULL DEFAULT true,
    not_following_text TEXT NOT NULL DEFAULT '',
    not_following_button TEXT NOT NULL DEFAULT '',
    final_text TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL DEFAULT '',
    link_button TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
    ig_scoped_id TEXT,
    username TEXT,
    comment_id TEXT UNIQUE,
    comment_text TEXT,
    status TEXT NOT NULL DEFAULT 'novo',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS leads_scoped_idx ON leads (ig_scoped_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    level TEXT NOT NULL DEFAULT 'info',
    type TEXT NOT NULL DEFAULT 'geral',
    message TEXT NOT NULL DEFAULT '',
    data JSONB
  )`,
  `CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at DESC)`,
];

async function open(): Promise<Driver> {
  const url = connectionString();
  let driver: Driver;

  if (url) {
    const { default: postgres } = await import("postgres");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const sql = postgres(url, {
      ssl: local ? false : "require",
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    driver = {
      kind: "postgres",
      query: async (text, params = []) =>
        (await sql.unsafe(text, params as never[])) as unknown as Row[],
    };
  } else if (process.env.VERCEL) {
    throw new DbConfigError(
      "Banco de dados não configurado. Na Vercel, abra o projeto > Storage e conecte um banco Neon (ele cria a variável DATABASE_URL sozinho). Depois faça um novo deploy.",
    );
  } else {
    // Teste local sem DATABASE_URL: banco em arquivo
    const dir = path.join(process.cwd(), ".data");
    fs.mkdirSync(dir, { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(path.join(dir, "pglite"));
    await db.waitReady;
    driver = {
      kind: "pglite",
      query: async (text, params = []) => {
        const r = await db.query(text, params as unknown[]);
        return r.rows as Row[];
      },
    };
  }

  for (const stmt of SCHEMA) {
    await driver.query(stmt);
  }
  return driver;
}

async function db(): Promise<Driver> {
  if (!g.__autodmDb) {
    g.__autodmDb = open().catch((err) => {
      g.__autodmDb = undefined; // tenta de novo na próxima chamada
      throw err;
    });
  }
  return g.__autodmDb;
}

/** Executa uma consulta SQL com parâmetros $1, $2... */
export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const d = await db();
  return (await d.query(text, params)) as unknown as T[];
}

export async function dbCheck(): Promise<{ ok: boolean; kind?: string; error?: string }> {
  try {
    const d = await db();
    await d.query("SELECT 1");
    return { ok: true, kind: d.kind };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await q<{ value: string | null }>("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await q(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, value],
  );
}

export interface Account {
  ig_user_id: string;
  app_scoped_id: string | null;
  username: string | null;
  name: string | null;
  picture: string | null;
  access_token: string;
  token_expires_at: Date | null;
  refreshed_at: Date | null;
}

export async function getAccount(): Promise<Account | null> {
  const rows = await q<Account>("SELECT * FROM account WHERE id = 1");
  const a = rows[0];
  if (!a || !a.access_token) return null;
  return a;
}

export interface Automation {
  id: number;
  name: string;
  active: boolean;
  media_id: string | null;
  media_permalink: string | null;
  media_thumb: string | null;
  media_caption: string | null;
  keywords: string;
  match_any: boolean;
  public_replies: string;
  opening_text: string;
  opening_button: string;
  require_follow: boolean;
  not_following_text: string;
  not_following_button: string;
  final_text: string;
  link_url: string;
  link_button: string;
}
