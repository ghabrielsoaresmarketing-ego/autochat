import Link from "next/link";
import DbError from "@/components/DbError";
import ToggleBadge from "@/components/ToggleBadge";
import { getAccount, q, type Account } from "@/lib/db";
import { ago, STATUS_LABEL } from "@/lib/format";
import { shorten } from "@/lib/text";

export const dynamic = "force-dynamic";

interface AutoRow {
  id: number;
  name: string;
  active: boolean;
  media_id: string | null;
  media_thumb: string | null;
  media_caption: string | null;
  keywords: string;
  match_any: boolean;
  leads_count: number;
}
interface LeadRow {
  id: number;
  username: string | null;
  comment_text: string | null;
  status: string;
  created_at: Date;
  automation_name: string | null;
}

export default async function HomePage() {
  let account: Account | null;
  let stats: { d24: number; total: number; links: number; waiting: number };
  let autos: AutoRow[];
  let leads: LeadRow[];
  try {
    account = await getAccount();
    const s = await q<{ d24: number; total: number; links: number; waiting: number }>(
      `SELECT
         (SELECT count(*)::int FROM leads WHERE created_at > now() - interval '24 hours') AS d24,
         (SELECT count(*)::int FROM leads WHERE status IN ('dm_enviada','aguardando_seguir','link_entregue')) AS total,
         (SELECT count(*)::int FROM leads WHERE status = 'link_entregue') AS links,
         (SELECT count(*)::int FROM leads WHERE status = 'aguardando_seguir') AS waiting`,
    );
    stats = s[0];
    autos = await q<AutoRow>(
      `SELECT a.id, a.name, a.active, a.media_id, a.media_thumb, a.media_caption, a.keywords, a.match_any,
              (SELECT count(*)::int FROM leads l WHERE l.automation_id = a.id) AS leads_count
       FROM automations a ORDER BY a.active DESC, a.id DESC`,
    );
    leads = await q<LeadRow>(
      `SELECT l.id, l.username, l.comment_text, l.status, l.created_at, a.name AS automation_name
       FROM leads l LEFT JOIN automations a ON a.id = l.automation_id
       ORDER BY l.id DESC LIMIT 8`,
    );
  } catch (e) {
    return <DbError message={e instanceof Error ? e.message : String(e)} />;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Automações</h1>
          <p className="sub">Quem comenta a palavra-chave recebe o link no direct, automaticamente.</p>
        </div>
        <Link href="/automacoes/nova" className="btn">
          ＋ Nova automação
        </Link>
      </div>

      {!account && (
        <div className="alert alert-bad">
          O Instagram ainda não está conectado. <Link href="/configuracao">Ir para Configuração →</Link>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="n">{stats.d24}</div>
          <div className="l">Comentários nas últimas 24h</div>
        </div>
        <div className="stat">
          <div className="n">{stats.total}</div>
          <div className="l">Comentários atendidos</div>
        </div>
        <div className="stat">
          <div className="n">{stats.links}</div>
          <div className="l">Links entregues</div>
        </div>
        <div className="stat">
          <div className="n">{stats.waiting}</div>
          <div className="l">Aguardando seguir</div>
        </div>
      </div>

      <div className="card">
        <h2>Suas automações</h2>
        {autos.length === 0 ? (
          <div className="empty">
            <div className="big">🚀</div>
            <p>Você ainda não criou nenhuma automação.</p>
            <Link href="/automacoes/nova" className="btn">
              Criar a primeira
            </Link>
          </div>
        ) : (
          <ul className="list">
            {autos.map((a) => (
              <li key={a.id} className="row">
                {a.media_thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={a.media_thumb} alt="" />
                ) : (
                  <div className="thumb">📌</div>
                )}
                <Link href={`/automacoes/${a.id}`} className="grow" style={{ color: "inherit" }}>
                  <div className="title">{a.name}</div>
                  <div className="meta">
                    {a.media_id ? shorten(a.media_caption || "Post específico", 40) : "Qualquer post"} ·{" "}
                    {a.match_any ? "qualquer comentário" : `palavras: ${a.keywords}`} · {a.leads_count}{" "}
                    {a.leads_count === 1 ? "pessoa" : "pessoas"}
                  </div>
                </Link>
                <ToggleBadge id={a.id} active={a.active} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Últimas pessoas</h2>
        {leads.length === 0 ? (
          <div className="empty">
            <div className="big">💬</div>
            <p>Quando alguém comentar, aparece aqui.</p>
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
                      “{shorten(l.comment_text || "", 50)}” · {l.automation_name ?? "—"} · {ago(l.created_at)}
                    </div>
                  </div>
                  <span className={`badge badge-${st.tone}`}>{st.text}</span>
                </li>
              );
            })}
          </ul>
        )}
        {leads.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Link href="/atividade">Ver toda a atividade →</Link>
          </div>
        )}
      </div>
    </>
  );
}
