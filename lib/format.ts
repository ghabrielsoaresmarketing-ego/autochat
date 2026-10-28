const TZ = "America/Sao_Paulo";

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ago(d: Date | string | null | undefined): string {
  if (!d) return "nunca";
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export const STATUS_LABEL: Record<string, { text: string; tone: "ok" | "wait" | "bad" | "neutral" }> = {
  novo: { text: "Novo", tone: "neutral" },
  dm_enviada: { text: "DM enviada", tone: "wait" },
  aguardando_seguir: { text: "Aguardando seguir", tone: "wait" },
  link_entregue: { text: "Link entregue", tone: "ok" },
  erro: { text: "Erro", tone: "bad" },
};
