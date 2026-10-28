import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "autodm_sessao";
const DAYS = 90;
export const SESSION_MAX_AGE = DAYS * 24 * 60 * 60;

function key(): Buffer {
  return crypto
    .createHash("sha256")
    .update("autodm-session:" + (process.env.ADMIN_PASSWORD || ""))
    .digest();
}

function sign(value: string): string {
  return crypto.createHmac("sha256", key()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Cria o valor do cookie de sessão (validade de 90 dias, assinado com HMAC) */
export function makeSessionToken(): string {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function checkSessionToken(token?: string | null): boolean {
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  const n = Number(exp);
  return Number.isFinite(n) && n > Date.now();
}

export function passwordOk(input: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !input) return false;
  const h = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(real));
}

/** Para páginas (server components): manda para /login se não estiver logado */
export async function requireAuth(): Promise<void> {
  const c = await cookies();
  if (!checkSessionToken(c.get(SESSION_COOKIE)?.value)) redirect("/login");
}

export async function isLogged(): Promise<boolean> {
  const c = await cookies();
  return checkSessionToken(c.get(SESSION_COOKIE)?.value);
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Para rotas de API */
export function apiAuthed(req: Request): boolean {
  return checkSessionToken(readCookie(req, SESSION_COOKIE));
}
