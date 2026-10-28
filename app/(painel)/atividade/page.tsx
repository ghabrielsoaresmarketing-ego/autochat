import Link from "next/link";
import DbError from "@/components/DbError";
import { q } from "@/lib/db";
import { ago, fmtDateTime, STATUS_LABEL } from "@/lib/format";
import { shorten } from "@/lib/text";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: number;
  username: string | null;
  comment_text: string | null;
  status: string;
  attempts: number;
  created_at: Date;
  updated_at: Date;
  automation_name: string | null;
}
interface EventRow {
  id: number;
  created_at: Date;
  level: string;
  type: string;
  message: string;
  data: unknown;
}

const LEVEL: Record<string, { label: string; cls: string }> = {
  info: { label: "info", cls: "badge-neutral" },
  success: { label: "sucesso", cls: "badge-ok" },
  warn: { label: "atenção", cls: "badge-wait" },
  error: { label: "erro", cls: "badge-bad" },
};

export default async function AtividadePage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; erros?: string }>;
}) {
  const sp = await searchParams;
  const aba = sp.aba === "registro" ? "registro" : "pessoas";
  const onlyErrors = sp.erros === "1";

  let leads: LeadRow[] = [];
  let events: EventRow[] = [];
  try {
    if (aba === "pessoas") {
      leads = await q<LeadRow>(
        `SELECT l.id, l.username, l.comment_text, l.status, l.attempts, l.created_at, l.updated_at, a.name AS automation_name
         FROM leads l LEFT JOIN automations a ON a.id = l.automation_id
         ORDER BY l.id DESC LIMIT 100`,
      );
    } else {
      events = await q<EventRow>(
        `SELECT id, created_at, level, type, message, data FROM events
         ${onlyErrors ? "WHERE level IN ('error','warn')" : ""}
         ORDER BY id DESC LIMIT 150`,
      );
    }
  } catch (e) {
    return <DbError message={e instanceof Error ? e.message : String(e)} />;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Atividade</h1>
          <p className="sub">Tudo o que o AutoDM fez, em linguagem simples.</p>
        </div>
      </div>

      <div className="tabs">
        <Link href="/atividade" className={aba === "pessoas" ? "active" : ""}>
          Pessoas
        </Link>
        <Link href="/atividade?aba=registro" className={aba === "registro" ? "active" : ""}>
          Registro técnico
        </Link>
      </div>

      {aba === "pessoas" ? (
        <div className="card">
          {leads.length === 0 ? (
            <div className="empty">
              <div className="big">💬</div>
              <p>Ninguém comentou ainda. Quando comentarem a palavra-chave, a pessoa aparece aqui com o status.</p>
            </div>
          ) : (
            <ul className="list">
              {leads.map((l) => {
                const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.novo;
                return (
                  <li key={l.id} className="row">
                    <div className="avatar">{(l.username || "?").charAt(0).toUpperCase()}</div>
                    <div className="grow">
                      <div className="title">{l.username ? `@${l.username}` : "Alguém"}</div>
                      <div className="meta">
                        “{shorten(l.comment_text || "", 60)}” · {l.automation_name ?? "automação excluída"}
                      </div>
                      <div className="meta">
                        {fmtDateTime(l.created_at)} ({ago(l.created_at)})
                        {l.attempts > 0 ? ` · ${l.attempts} tentativa(s) com erro` : ""}
                      </div>
                    </div>
                    <span className={`badge badge-${st.tone}`}>{st.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="filters">
            <Link href="/atividade?aba=registro" className={`chip ${!onlyErrors ? "active" : ""}`}>
              Tudo
            </Link>
            <Link href="/atividade?aba=registro&erros=1" className={`chip ${onlyErrors ? "active" : ""}`}>
              Só erros e avisos
            </Link>
          </div>
          <div className="card">
            {events.length === 0 ? (
              <div className="empty">
                <div className="big">🧾</div>
                <p>{onlyErrors ? "Nenhum erro por aqui. 🎉" : "Ainda não há registros."}</p>
              </div>
            ) : (
              events.map((ev) => {
                const lv = LEVEL[ev.level] ?? LEVEL.info;
                return (
                  <div key={ev.id} className="log">
                    <div className="log-head">
                      <span className={`badge ${lv.cls}`}>{lv.label}</span>
                      <span>{fmtDateTime(ev.created_at)}</span>
                      <span>· {ev.type}</span>
                    </div>
                    <div className="log-msg">{ev.message}</div>
                    {ev.data != null && (
                      <details>
                        <summary>Detalhes técnicos</summary>
                        <pre>{JSON.stringify(ev.data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p className="hint">Registros com mais de 30 dias são apagados automaticamente.</p>
        </>
      )}
    </>
  );
}
