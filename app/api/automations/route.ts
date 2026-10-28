import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { FIELDS, parseInput } from "@/lib/automation-input";
import { q } from "@/lib/db";
import { log } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = parseInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const d = parsed.data;

  const cols = FIELDS.join(", ");
  const marks = FIELDS.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await q<{ id: number }>(
    `INSERT INTO automations (${cols}) VALUES (${marks}) RETURNING id`,
    FIELDS.map((f) => d[f]),
  );
  await log("info", "automacao", `Automação "${d.name}" criada.`);
  return NextResponse.json({ id: rows[0].id });
}
