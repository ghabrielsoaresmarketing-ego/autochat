/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULTS = {
  name: "Nova automação",
  active: true,
  media_id: null as string | null,
  media_permalink: null as string | null,
  media_thumb: null as string | null,
  media_caption: null as string | null,
  keywords: "quero",
  match_any: false,
  public_replies: "Te enviei no privado! 📩\nOlha seu direct! 💌\nConfere sua DM! ✨",
  opening_text: "Oi {usuario}! 👋 Que bom ter você por aqui! Toque no botão abaixo para receber o seu link.",
  opening_button: "Quero o link",
  require_follow: true,
  not_following_text:
    "Ops! Parece que você ainda não me segue 😅 Siga o perfil e toque no botão de novo para liberar o seu link.",
  not_following_button: "Já segui!",
  final_text: "Prontinho, {usuario}! 🎉 Aqui está o seu link:",
  link_url: "",
  link_button: "Abrir link",
};

export type AutomationInput = typeof DEFAULTS;

const str = (v: any, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: any, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : null;

/** Valida e limpa o que veio do formulário. Retorna o objeto limpo ou uma mensagem de erro. */
export function parseInput(body: any): { ok: true; data: AutomationInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Dados inválidos." };

  const d: AutomationInput = {
    name: str(body.name, 80).trim() || DEFAULTS.name,
    active: body.active !== false,
    media_id: optStr(body.media_id, 100),
    media_permalink: optStr(body.media_permalink, 500),
    media_thumb: optStr(body.media_thumb, 2000),
    media_caption: optStr(body.media_caption, 300),
    keywords: str(body.keywords, 300).trim(),
    match_any: body.match_any === true,
    public_replies: str(body.public_replies, 1500).trim(),
    opening_text: str(body.opening_text, 640).trim(),
    opening_button: str(body.opening_button, 20).trim(),
    require_follow: body.require_follow !== false,
    not_following_text: str(body.not_following_text, 640).trim(),
    not_following_button: str(body.not_following_button, 20).trim(),
    final_text: str(body.final_text, 640).trim(),
    link_url: str(body.link_url, 2000).trim(),
    link_button: str(body.link_button, 20).trim(),
  };

  if (!d.match_any && !d.keywords) {
    return { ok: false, error: "Informe ao menos uma palavra-chave ou marque \"qualquer comentário\"." };
  }
  if (!d.final_text) return { ok: false, error: "Escreva a mensagem final (etapa 7)." };
  if (!d.link_button) return { ok: false, error: "Escreva o texto do botão do link (etapa 7)." };
  if (!/^https?:\/\/\S+$/i.test(d.link_url)) {
    return { ok: false, error: "O link precisa começar com http:// ou https:// (etapa 7)." };
  }
  if (d.require_follow) {
    if (!d.opening_text || !d.opening_button) return { ok: false, error: "Preencha a primeira DM e o botão (etapa 5)." };
    if (!d.not_following_text || !d.not_following_button) {
      return { ok: false, error: "Preencha a mensagem e o botão para quem ainda não segue (etapa 6)." };
    }
  }
  return { ok: true, data: d };
}

export const FIELDS = [
  "name", "active", "media_id", "media_permalink", "media_thumb", "media_caption", "keywords", "match_any",
  "public_replies", "opening_text", "opening_button", "require_follow", "not_following_text",
  "not_following_button", "final_text", "link_url", "link_button",
] as const;
