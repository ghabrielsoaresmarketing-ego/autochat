import { NextResponse } from "next/server";
import { makeSessionToken, passwordOk, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* corpo vazio */
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "A variável ADMIN_PASSWORD ainda não foi definida na Vercel." },
      { status: 500 },
    );
  }
  if (!passwordOk(password)) {
    await new Promise((r) => setTimeout(r, 800)); // freia tentativas em sequência
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
