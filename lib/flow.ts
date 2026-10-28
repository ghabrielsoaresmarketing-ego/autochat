import { getAccount, q, setSetting, type Account, type Automation } from "./db";
import { log } from "./events";
import {
  errData,
  errText,
  getFollowStatus,
  replyToComment,
  sendButtonMessage,
} from "./ig";
import { clamp, fill, matchesKeywords, pickLine, shorten } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAYLOAD_PREFIX = "AUTODM_LINK:";

/** Ponto de entrada: recebe o corpo do webhook já validado */
export async function handleWebhook(body: any): Promise<void> {
  await setSetting("last_webhook_at", new Date().toISOString()).catch(() => {});

  const account = await getAccount();
  if (!account) {
    await log(
      "warn",
      "webhook",
      "Chegou um aviso do Instagram, mas nenhuma conta está conectada. Conecte em Configuração.",
    );
    return;
  }

  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        try {
          await handleComment(account, change.value ?? {});
        } catch (e) {
          await log("error", "comentario", `Erro ao processar um comentário: ${errText(e)}`, errData(e));
        }
      }
    }
    for (const m of entry.messaging ?? []) {
      try {
        await handleMessaging(account, m);
      } catch (e) {
        await log("error", "mensagem", `Erro ao processar uma mensagem: ${errText(e)}`, errData(e));
      }
    }
  }
}

function isOwnAccount(account: Account, id?: string | null): boolean {
  if (!id) return false;
  return id === account.ig_user_id || id === account.app_scoped_id;
}

async function pickAutomation(mediaId: string | null, text: string): Promise<Automation | null> {
  const list = await q<Automation>("SELECT * FROM automations WHERE active = true ORDER BY id");
  const fits = (a: Automation) => a.match_any || matchesKeywords(text, a.keywords) !== null;
  // Post específico tem prioridade sobre "qualquer post"
  const specific = list.find((a) => a.media_id && mediaId && a.media_id === mediaId && fits(a));
  if (specific) return specific;
  return list.find((a) => !a.media_id && fits(a)) ?? null;
}

async function setLead(id: number, status: string, bumpAttempts = false): Promise<void> {
  await q(
    `UPDATE leads SET status = $2, attempts = attempts + $3, updated_at = now() WHERE id = $1`,
    [id, status, bumpAttempts ? 1 : 0],
  );
}

// ------------------------------------------------------------------ Comentário

async function handleComment(account: Account, v: any): Promise<void> {
  const commentId: string | undefined = v.id ? String(v.id) : undefined;
  const text: string = typeof v.text === "string" ? v.text : "";
  const fromId: string | undefined = v.from?.id ? String(v.from.id) : undefined;
  const username: string | null = v.from?.username ?? null;
  const mediaId: string | null = v.media?.id ? String(v.media.id) : null;
  const who = username ? `@${username}` : "Alguém";

  if (!commentId) {
    await log("warn", "comentario", "Chegou um comentário sem identificação; ignorado.", v);
    return;
  }
  if (isOwnAccount(account, fromId)) return; // comentário da própria conta

  const automation = await pickAutomation(mediaId, text);
  if (!automation) {
    await log("info", "comentario", `${who} comentou "${shorten(text)}" → nenhuma automação ativa combinou, nada enviado.`);
    return;
  }

  // Evita duplicados (o Instagram às vezes reenvia o mesmo aviso)
  const inserted = await q<{ id: number }>(
    `INSERT INTO leads (automation_id, ig_scoped_id, username, comment_id, comment_text, status)
     VALUES ($1, $2, $3, $4, $5, 'novo')
     ON CONFLICT (comment_id) DO NOTHING
     RETURNING id`,
    [automation.id, fromId ?? null, username, commentId, text],
  );
  if (inserted.length === 0) {
    await log("info", "comentario", `${who} comentou "${shorten(text)}" → esse comentário já tinha sido atendido (aviso repetido).`);
    return;
  }
  const leadId = inserted[0].id;
  const token = account.access_token;

  // 1) DM inicial ("resposta privada" ao comentário)
  try {
    if (automation.require_follow) {
      const r = await sendButtonMessage(
        token,
        { comment_id: commentId },
        clamp(fill(automation.opening_text, username), 640),
        {
          kind: "postback",
          title: clamp(automation.opening_button, 20),
          payload: PAYLOAD_PREFIX + automation.id,
        },
      );
      await setLead(leadId, "dm_enviada");
      await log(
        "success",
        "dm",
        `${who} comentou "${shorten(text)}" → DM enviada (${modeText(r.mode)}). Aguardando o clique no botão.`,
        r.firstError ? { aviso: "O formato com botão foi recusado; usamos um formato alternativo.", motivo: errData(r.firstError) } : undefined,
      );
    } else {
      const r = await sendButtonMessage(
        token,
        { comment_id: commentId },
        clamp(fill(automation.final_text, username), 640),
        { kind: "url", title: clamp(automation.link_button, 20), url: automation.link_url },
      );
      await setLead(leadId, "link_entregue");
      await log(
        "success",
        "dm",
        `${who} comentou "${shorten(text)}" → link enviado direto na DM (${modeText(r.mode)}).`,
        r.firstError ? { aviso: "O formato com botão foi recusado; usamos um formato alternativo.", motivo: errData(r.firstError) } : undefined,
      );
    }
  } catch (e) {
    await setLead(leadId, "erro", true);
    await log(
      "error",
      "dm",
      `${who} comentou "${shorten(text)}" → NÃO consegui enviar a DM: ${errText(e)}. ${hint(e)}`,
      errData(e),
    );
  }

  // 2) Resposta pública opcional
  const line = pickLine(automation.public_replies || "");
  if (line) {
    try {
      await replyToComment(token, commentId, clamp(fill(line, username), 300));
      await log("info", "resposta_publica", `Respondi publicamente ao comentário de ${who}: "${shorten(fill(line, username))}"`);
    } catch (e) {
      await log("warn", "resposta_publica", `Não consegui responder publicamente ao comentário de ${who}: ${errText(e)}`, errData(e));
    }
  }
}

function modeText(mode: string): string {
  if (mode === "botao") return "com botão";
  if (mode === "resposta_rapida") return "com resposta rápida";
  return "como texto simples";
}

function hint(e: unknown): string {
  const t = errText(e).toLowerCase();
  if (t.includes("permission") || t.includes("permissão") || t.includes("(#10)")) {
    return "Dica: confira se o app tem a permissão de mensagens e se a conta está como testadora (modo desenvolvimento).";
  }
  if (t.includes("expired") || t.includes("invalid oauth") || t.includes("access token")) {
    return "Dica: o acesso ao Instagram pode ter expirado. Reconecte em Configuração.";
  }
  if (t.includes("window") || t.includes("7 days") || t.includes("already")) {
    return "Dica: a resposta privada só pode ser enviada uma vez por comentário e em até 7 dias.";
  }
  return "";
}

// ------------------------------------------------------------------ Mensagens (cliques e textos)

async function handleMessaging(account: Account, m: any): Promise<void> {
  if (m.read || m.reaction) return;
  if (m.message?.is_echo) return;
  const senderId: string | undefined = m.sender?.id ? String(m.sender.id) : undefined;
  if (!senderId || isOwnAccount(account, senderId)) return;

  const payload: string | undefined = m.postback?.payload ?? m.message?.quick_reply?.payload;

  if (typeof payload === "string" && payload.startsWith(PAYLOAD_PREFIX)) {
    const automationId = Number(payload.slice(PAYLOAD_PREFIX.length));
    if (!Number.isFinite(automationId)) return;
    await continueFlow(account, senderId, automationId, "clicou no botão");
    return;
  }

  if (typeof m.message?.text === "string") {
    // Pessoa respondeu com texto: se há um fluxo pendente (últimos 7 dias), continua
    const pending = await q<{ automation_id: number }>(
      `SELECT automation_id FROM leads
       WHERE ig_scoped_id = $1 AND status IN ('dm_enviada', 'aguardando_seguir')
         AND created_at > now() - interval '7 days'
       ORDER BY id DESC LIMIT 1`,
      [senderId],
    );
    if (pending[0]) {
      await continueFlow(account, senderId, pending[0].automation_id, "respondeu com texto");
    }
  }
}

async function continueFlow(
  account: Account,
  senderId: string,
  automationId: number,
  how: string,
): Promise<void> {
  const token = account.access_token;
  const found = await q<Automation>("SELECT * FROM automations WHERE id = $1", [automationId]);
  const a = found[0];

  const leads = await q<{ id: number; username: string | null }>(
    `SELECT id, username FROM leads
     WHERE ig_scoped_id = $1 AND automation_id = $2 AND created_at > now() - interval '7 days'
     ORDER BY id DESC LIMIT 1`,
    [senderId, automationId],
  );
  const lead = leads[0];
  const baseName = lead?.username ? `@${lead.username}` : "Alguém";

  if (!a) {
    await log("warn", "clique", `${baseName} ${how}, mas essa automação não existe mais (foi excluída).`);
    return;
  }

  let username = lead?.username ?? null;
  let follows: boolean | null = true;

  if (a.require_follow) {
    try {
      const st = await getFollowStatus(token, senderId);
      username = username ?? st.username;
      follows = st.follows;
    } catch (e) {
      if (lead) await setLead(lead.id, "erro", true);
      await log(
        "error",
        "seguir",
        `${baseName} ${how}, mas não consegui verificar se a pessoa segue você: ${errText(e)}`,
        errData(e),
      );
      return;
    }
  }
  const who = username ? `@${username}` : baseName;

  if (a.require_follow && follows !== true) {
    try {
      const r = await sendButtonMessage(
        token,
        { id: senderId },
        clamp(fill(a.not_following_text, username), 640),
        { kind: "postback", title: clamp(a.not_following_button, 20), payload: PAYLOAD_PREFIX + a.id },
      );
      if (lead) await setLead(lead.id, "aguardando_seguir");
      await log(
        "info",
        "seguir",
        `${who} ${how} → ainda não segue você; pedi para seguir (${modeText(r.mode)}).`,
      );
    } catch (e) {
      if (lead) await setLead(lead.id, "erro", true);
      await log("error", "seguir", `${who} ${how} → não consegui enviar o pedido para seguir: ${errText(e)}`, errData(e));
    }
    return;
  }

  try {
    const r = await sendButtonMessage(
      token,
      { id: senderId },
      clamp(fill(a.final_text, username), 640),
      { kind: "url", title: clamp(a.link_button, 20), url: a.link_url },
    );
    if (lead) await setLead(lead.id, "link_entregue");
    await log("success", "link", `${who} ${how} → segue você → link entregue (${modeText(r.mode)}). 🎉`);
  } catch (e) {
    if (lead) await setLead(lead.id, "erro", true);
    await log("error", "link", `${who} ${how} → não consegui entregar o link: ${errText(e)}`, errData(e));
  }
}
