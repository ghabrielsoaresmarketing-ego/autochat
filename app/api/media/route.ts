import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { getAccount } from "@/lib/db";
import { errText, listMedia } from "@/lib/ig";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Conecte o Instagram em Configuração para escolher um post." }, { status: 400 });
  }
  try {
    const items = await listMedia(account.access_token, 30);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: `Não consegui buscar seus posts: ${errText(e)}` }, { status: 502 });
  }
}
