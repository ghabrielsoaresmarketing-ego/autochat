import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { getAccount, q } from "@/lib/db";
import { log } from "@/lib/events";
import { unsubscribeApp } from "@/lib/ig";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const account = await getAccount();
  if (account) {
    try {
      await unsubscribeApp(account.access_token);
    } catch {
      /* sem problema se falhar */
    }
    await q("DELETE FROM account WHERE id = 1");
    await log("info", "conexao", `Instagram desconectado (@${account.username ?? "?"}). O acesso guardado foi apagado.`);
  }
  return NextResponse.json({ ok: true });
}
