import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { getAccount, q } from "@/lib/db";
import { cleanupEvents, log } from "@/lib/events";
import { errData, errText, refreshToken } from "@/lib/ig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Roda todo dia (vercel.json): renova o acesso do Instagram e limpa registros antigos */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization") === `Bearer ${secret}`;
  const fromVercel = (req.headers.get("user-agent") || "").startsWith("vercel-cron");
  const allowed = secret ? bearer || apiAuthed(req) : fromVercel || apiAuthed(req);
  if (!allowed) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await cleanupEvents();

  const account = await getAccount();
  if (!account) return NextResponse.json({ ok: true, refreshed: false, reason: "sem conta" });

  const last = account.refreshed_at ? new Date(account.refreshed_at).getTime() : 0;
  const days = (Date.now() - last) / 86_400_000;
  if (days < 7) return NextResponse.json({ ok: true, refreshed: false, reason: "ainda não precisa" });

  try {
    const r = await refreshToken(account.access_token);
    await q(
      "UPDATE account SET access_token = $1, token_expires_at = $2, refreshed_at = now() WHERE id = 1",
      [r.access_token, new Date(Date.now() + r.expires_in * 1000)],
    );
    await log("success", "token", "O acesso ao Instagram foi renovado automaticamente por mais 60 dias.");
    return NextResponse.json({ ok: true, refreshed: true });
  } catch (e) {
    await log(
      "error",
      "token",
      `Não consegui renovar o acesso ao Instagram: ${errText(e)}. Se persistir, reconecte em Configuração.`,
      errData(e),
    );
    return NextResponse.json({ ok: false, error: errText(e) }, { status: 500 });
  }
}
