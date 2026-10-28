import { NextResponse } from "next/server";
import { apiAuthed, readCookie } from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import { q } from "@/lib/db";
import { log } from "@/lib/events";
import {
  errData,
  errText,
  exchangeCode,
  getProfile,
  longLivedToken,
  subscribeApp,
} from "@/lib/ig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const base = await getBaseUrl(req);
  const back = (msg: string, ok = false) =>
    NextResponse.redirect(`${base}/configuracao?${ok ? "ok" : "erro"}=${encodeURIComponent(msg)}`);

  if (!apiAuthed(req)) return NextResponse.redirect(`${base}/login`);

  const p = new URL(req.url).searchParams;
  if (p.get("error")) {
    const why = p.get("error_description") || p.get("error_reason") || p.get("error") || "";
    await log("warn", "conexao", `A conexão com o Instagram foi cancelada ou recusada: ${why}`);
    return back("A conexão foi cancelada no Instagram. Tente de novo.");
  }

  const state = p.get("state");
  const saved = readCookie(req, "autodm_oauth_state");
  if (!state || !saved || state !== saved) {
    return back("A verificação de segurança falhou (state). Clique em Conectar de novo.");
  }

  const code = (p.get("code") || "").replace(/#_$/, "");
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!code || !clientId || !clientSecret) {
    return back("Faltam o código de retorno ou as chaves INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET.");
  }

  try {
    const short = await exchangeCode({
      clientId,
      clientSecret,
      redirectUri: `${base}/api/instagram/callback`,
      code,
    });
    const long = await longLivedToken(clientSecret, short.access_token);
    const profile = await getProfile(long.access_token);

    // O entry.id dos webhooks corresponde a user_id (não a id): salvamos os dois.
    const igUserId = profile.user_id || short.user_id || profile.id || "";
    const scopedId = profile.id || short.user_id || null;
    const expires = new Date(Date.now() + long.expires_in * 1000);

    await q(
      `INSERT INTO account (id, ig_user_id, app_scoped_id, username, name, picture, access_token, token_expires_at, refreshed_at, connected_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         ig_user_id = EXCLUDED.ig_user_id, app_scoped_id = EXCLUDED.app_scoped_id,
         username = EXCLUDED.username, name = EXCLUDED.name, picture = EXCLUDED.picture,
         access_token = EXCLUDED.access_token, token_expires_at = EXCLUDED.token_expires_at,
         refreshed_at = now(), connected_at = now()`,
      [igUserId, scopedId, profile.username, profile.name, profile.profile_picture_url, long.access_token, expires],
    );

    let subscribed = true;
    try {
      await subscribeApp(long.access_token);
    } catch (e) {
      subscribed = false;
      await log("warn", "conexao", `Conectei a conta, mas não consegui ativar o recebimento de avisos: ${errText(e)}`, errData(e));
    }

    await log(
      "success",
      "conexao",
      `Instagram conectado: @${profile.username ?? "?"}. ${subscribed ? "Recebimento de comentários e mensagens ativado." : "Falta ativar os avisos (webhook)."}`,
    );
    const res = back(`Conectado como @${profile.username ?? ""}!`, true);
    res.cookies.set("autodm_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    await log("error", "conexao", `Não consegui conectar o Instagram: ${errText(e)}`, errData(e));
    return back(`Não consegui conectar: ${errText(e)}`);
  }
}
