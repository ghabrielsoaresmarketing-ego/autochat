import { IG_GRAPH } from "./config";

export class IgError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function request(
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string | null,
  opts: { query?: Record<string, string>; json?: unknown; form?: Record<string, string> } = {},
): Promise<Json> {
  const u = new URL(url);
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v);
  if (token) u.searchParams.set("access_token", token);

  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form).toString();
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(u, { method, headers, body, cache: "no-store" });
  const text = await res.text();
  let json: Json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json.error || json.error_type) {
    const msg =
      json.error?.message || json.error_message || json.error?.error_user_msg || `HTTP ${res.status}`;
    throw new IgError(String(msg), res.status, json);
  }
  return json;
}

/** Mensagem de erro curta e útil para o registro */
export function errText(e: unknown): string {
  if (e instanceof IgError) {
    const b = e.body as Json;
    const code = b?.error?.code ? ` (código ${b.error.code}${b.error.error_subcode ? "/" + b.error.error_subcode : ""})` : "";
    return `${e.message}${code}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export function errData(e: unknown): unknown {
  if (e instanceof IgError) return { status: e.status, resposta: e.body };
  return { erro: e instanceof Error ? e.message : String(e) };
}

// ---------------------------------------------------------------- OAuth

/** Troca o "code" do login pelo token de curta duração. A resposta pode vir em data[0]. */
export async function exchangeCode(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; user_id: string }> {
  const r = await request("POST", "https://api.instagram.com/oauth/access_token", null, {
    form: {
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: opts.redirectUri,
      code: opts.code,
    },
  });
  const d = Array.isArray(r.data) ? r.data[0] : r;
  if (!d?.access_token) throw new IgError("A resposta do Instagram veio sem token.", 200, r);
  return { access_token: String(d.access_token), user_id: String(d.user_id ?? "") };
}

/** Token longo (60 dias) */
export async function longLivedToken(
  clientSecret: string,
  shortToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const r = await request("GET", "https://graph.instagram.com/access_token", null, {
    query: {
      grant_type: "ig_exchange_token",
      client_secret: clientSecret,
      access_token: shortToken,
    },
  });
  return { access_token: String(r.access_token), expires_in: Number(r.expires_in ?? 5184000) };
}

export async function refreshToken(
  token: string,
): Promise<{ access_token: string; expires_in: number }> {
  const r = await request("GET", "https://graph.instagram.com/refresh_access_token", null, {
    query: { grant_type: "ig_refresh_token", access_token: token },
  });
  return { access_token: String(r.access_token), expires_in: Number(r.expires_in ?? 5184000) };
}

// ---------------------------------------------------------------- Perfil e posts

export async function getProfile(token: string): Promise<{
  id: string | null;
  user_id: string | null;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
}> {
  const r = await request("GET", `${IG_GRAPH}/me`, token, {
    query: { fields: "user_id,username,name,profile_picture_url" },
  });
  return {
    id: r.id ? String(r.id) : null,
    user_id: r.user_id ? String(r.user_id) : null,
    username: r.username ?? null,
    name: r.name ?? null,
    profile_picture_url: r.profile_picture_url ?? null,
  };
}

export async function subscribeApp(token: string): Promise<void> {
  await request("POST", `${IG_GRAPH}/me/subscribed_apps`, token, {
    query: { subscribed_fields: "comments,messages,messaging_postbacks" },
  });
}

export async function unsubscribeApp(token: string): Promise<void> {
  await request("DELETE", `${IG_GRAPH}/me/subscribed_apps`, token);
}

export interface MediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

export async function listMedia(token: string, limit = 30): Promise<MediaItem[]> {
  const r = await request("GET", `${IG_GRAPH}/me/media`, token, {
    query: {
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      limit: String(limit),
    },
  });
  return (r.data ?? []) as MediaItem[];
}

// ---------------------------------------------------------------- Mensagens

export type Recipient = { comment_id: string } | { id: string };
export type Button =
  | { kind: "postback"; title: string; payload: string }
  | { kind: "url"; title: string; url: string };

async function postMessage(token: string, recipient: Recipient, message: unknown): Promise<Json> {
  return request("POST", `${IG_GRAPH}/me/messages`, token, {
    json: { recipient, message },
  });
}

/**
 * Envia texto + botão. Tenta o modelo de botão; se o Instagram recusar,
 * tenta texto com resposta rápida (botão de postback) ou texto com o link.
 */
export async function sendButtonMessage(
  token: string,
  recipient: Recipient,
  text: string,
  button: Button,
): Promise<{ mode: "botao" | "resposta_rapida" | "texto"; firstError?: unknown }> {
  const apiButton =
    button.kind === "postback"
      ? { type: "postback", title: button.title, payload: button.payload }
      : { type: "web_url", url: button.url, title: button.title };

  let firstError: unknown;
  try {
    await postMessage(token, recipient, {
      attachment: {
        type: "template",
        payload: { template_type: "button", text, buttons: [apiButton] },
      },
    });
    return { mode: "botao" };
  } catch (e) {
    firstError = e;
  }

  if (button.kind === "postback") {
    try {
      await postMessage(token, recipient, {
        text,
        quick_replies: [{ content_type: "text", title: button.title, payload: button.payload }],
      });
      return { mode: "resposta_rapida", firstError };
    } catch {
      /* cai para texto simples */
    }
    await postMessage(token, recipient, { text: `${text}\n\n(Responda qualquer mensagem aqui para continuar)` });
    return { mode: "texto", firstError };
  }

  await postMessage(token, recipient, { text: `${text}\n${button.url}` });
  return { mode: "texto", firstError };
}

export async function replyToComment(token: string, commentId: string, message: string): Promise<void> {
  await request("POST", `${IG_GRAPH}/${encodeURIComponent(commentId)}/replies`, token, {
    json: { message },
  });
}

/** Só funciona depois que a pessoa interagiu com a DM */
export async function getFollowStatus(
  token: string,
  igsid: string,
): Promise<{ username: string | null; follows: boolean | null }> {
  const r = await request("GET", `${IG_GRAPH}/${encodeURIComponent(igsid)}`, token, {
    query: { fields: "username,name,is_user_follow_business" },
  });
  return {
    username: r.username ?? null,
    follows: typeof r.is_user_follow_business === "boolean" ? r.is_user_follow_business : null,
  };
}
