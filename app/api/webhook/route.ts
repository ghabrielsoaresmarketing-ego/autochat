import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { appSecrets, verifyToken } from "@/lib/config";
import { log } from "@/lib/events";
import { handleWebhook } from "@/lib/flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Verificação do webhook (a Meta chama isto ao cadastrar a URL) */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");
  const expected = verifyToken();

  if (mode === "subscribe" && expected && token === expected && challenge) {
    await log("success", "webhook", "A Meta verificou o endereço do webhook com sucesso. ✅");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  await log(
    "warn",
    "webhook",
    expected
      ? "A Meta tentou verificar o webhook, mas o 'verify token' não bate. Copie de novo o valor da página Configuração."
      : "A Meta tentou verificar o webhook, mas o INSTAGRAM_APP_SECRET ainda não foi configurado na Vercel.",
  );
  return new NextResponse("Forbidden", { status: 403 });
}

function signatureOk(raw: string, header: string | null): boolean {
  if (!header) return false;
  const got = header.replace(/^sha256=/, "");
  for (const secret of appSecrets()) {
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** Recebe comentários, mensagens e cliques de botão */
export async function POST(req: Request) {
  const raw = await req.text();

  if (!signatureOk(raw, req.headers.get("x-hub-signature-256"))) {
    await log(
      "error",
      "webhook",
      "Recebi um aviso com assinatura inválida e descartei. Dica: confira se INSTAGRAM_APP_SECRET na Vercel é exatamente o 'Segredo do app do Instagram' (e não o da Meta/Facebook), e faça um novo deploy depois de mudar.",
    );
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    await log("error", "webhook", "Recebi um aviso que não é um JSON válido.");
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    await handleWebhook(body);
  } catch (e) {
    await log("error", "webhook", `Erro inesperado ao processar o aviso: ${e instanceof Error ? e.message : String(e)}`);
  }
  // Sempre 200 para a Meta não reenviar em loop
  return NextResponse.json({ ok: true });
}
