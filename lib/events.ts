import { q } from "./db";

export type Level = "info" | "success" | "warn" | "error";

/** Grava no registro de atividade (mensagens em português simples). Nunca derruba o fluxo. */
export async function log(
  level: Level,
  type: string,
  message: string,
  data?: unknown,
): Promise<void> {
  try {
    await q("INSERT INTO events (level, type, message, data) VALUES ($1, $2, $3, $4::jsonb)", [
      level,
      type,
      message,
      data === undefined ? null : JSON.stringify(data),
    ]);
  } catch (e) {
    console.error("[log] falha ao gravar evento:", e, message);
  }
}

/** Apaga registros com mais de 30 dias */
export async function cleanupEvents(): Promise<void> {
  try {
    await q("DELETE FROM events WHERE created_at < now() - interval '30 days'");
  } catch (e) {
    console.error("[log] falha ao limpar eventos:", e);
  }
}
