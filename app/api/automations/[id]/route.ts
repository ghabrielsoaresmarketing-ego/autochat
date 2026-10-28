import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { FIELDS, parseInput } from "@/lib/automation-input";
import { q } from "@/lib/db";
import { log } from "@/lib/events";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Salvar o editor inteiro */
export async function PUT(req: Request, ctx: Ctx) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Automação inválida." }, { status: 400 });

  const parsed = parseInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const d = parsed.data;

  const sets = FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const rows = await q<{ id: number }>(
    `UPDATE automations SET ${sets}, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, ...FIELDS.map((f) => d[f])],
  );
  if (rows.length === 0) return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  await log("info", "automacao", `Automação "${d.name}" salva.`);
  return NextResponse.json({ ok: true });
}

/** Só ligar/pausar */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Automação inválida." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.active !== "boolean") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const rows = await q<{ name: string }>(
    "UPDATE automations SET active = $2, updated_at = now() WHERE id = $1 RETURNING name",
    [id, body.active],
  );
  if (rows.length === 0) return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  await log("info", "automacao", `Automação "${rows[0].name}" ${body.active ? "ativada" : "pausada"}.`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!apiAuthed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Automação inválida." }, { status: 400 });
  const rows = await q<{ name: string }>("DELETE FROM automations WHERE id = $1 RETURNING name", [id]);
  if (rows.length) await log("info", "automacao", `Automação "${rows[0].name}" excluída.`);
  return NextResponse.json({ ok: true });
}
