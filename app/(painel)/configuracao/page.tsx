import Link from "next/link";
import CopyField from "@/components/CopyField";
import DisconnectButton from "@/components/DisconnectButton";
import { envStatus, getBaseUrl, verifyToken } from "@/lib/config";
import { dbCheck, getAccount, getSetting, q, type Account } from "@/lib/db";
import { ago, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function Step({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`check ${done ? "done" : ""}`}>
      <div className="check-num">{done ? "✓" : n}</div>
      <div className="check-body">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default async function ConfiguracaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const env = envStatus();
  const base = await getBaseUrl();
  const isProdUrl = !!process.env.VERCEL_PROJECT_PRODUCTION_URL || base.startsWith("http://localhost");

  const db = await dbCheck();
  let account: Account | null = null;
  let lastWebhook: string | null = null;
  let lastEvent: { created_at: Date } | null = null;
  if (db.ok) {
    account = await getAccount().catch(() => null);
    lastWebhook = await getSetting("last_webhook_at").catch(() => null);
    const r = await q<{ created_at: Date }>(
      "SELECT created_at FROM events WHERE type IN ('webhook','dm','link','seguir','clique') ORDER BY id DESC LIMIT 1",
    ).catch(() => [] as { created_at: Date }[]);
    lastEvent = r[0] ?? null;
  }

  const keysOk = env.adminPassword && env.appId && env.appSecret;
  const expires = account?.token_expires_at ? new Date(account.token_expires_at) : null;
  const daysLeft = expires ? Math.max(0, Math.floor((expires.getTime() - Date.now()) / 86_400_000)) : null;
  const token = verifyToken();
  const contact = env.contactEmail;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuração</h1>
          <p className="sub">Siga os passos na ordem. Cada um fica verde ✓ quando estiver pronto.</p>
        </div>
      </div>

      {sp.ok && <div className="alert alert-ok">✅ {sp.ok}</div>}
      {sp.erro && <div className="alert alert-bad">⚠️ {sp.erro}</div>}

      <div className="card">
        <Step n={1} done={db.ok} title="Banco de dados">
          {db.ok ? (
            <p>
              Conectado ({db.kind === "pglite" ? "banco local de teste" : "Postgres"}). As tabelas são criadas sozinhas.
            </p>
          ) : (
            <>
              <p>{db.error}</p>
              <p>
                Na Vercel: abra o projeto → <b>Storage</b> → conecte um banco <b>Neon</b>. Depois faça um novo deploy.
              </p>
            </>
          )}
        </Step>

        <Step n={2} done={!!keysOk} title="Chaves do app (variáveis na Vercel)">
          <p>Vercel → Settings → Environment Variables. Depois de mudar, faça um novo deploy.</p>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14 }}>
            <li>{env.adminPassword ? "✅" : "❌"} ADMIN_PASSWORD</li>
            <li>{env.appId ? "✅" : "❌"} INSTAGRAM_APP_ID</li>
            <li>{env.appSecret ? "✅" : "❌"} INSTAGRAM_APP_SECRET</li>
          </ul>
        </Step>

        <Step n={3} done={!!keysOk && isProdUrl} title="Endereços para colar no painel da Meta">
          <p>
            No painel de desenvolvedores da Meta, no seu app, abra <b>Instagram → Configuração da API com login do
            Instagram</b> e cole:
          </p>
          <CopyField label="URI de redirecionamento do OAuth (passo 4 da Meta)" value={`${base}/api/instagram/callback`} />
          <CopyField label="URL de callback do webhook (passo 2 da Meta)" value={`${base}/api/webhook`} />
          <CopyField label="Verify token (token de verificação)" value={token} />
          <CopyField label="URL da política de privacidade (Configurações do app → Básico)" value={`${base}/privacidade`} />
          <CopyField label="URL de exclusão de dados (Configurações do app → Básico)" value={`${base}/exclusao-de-dados`} />
          <p style={{ marginTop: 12 }}>
            No webhook, assine os campos <b>comments</b>, <b>messages</b> e <b>messaging_postbacks</b> (o AutoDM também
            tenta ativar isso sozinho ao conectar).
          </p>
        </Step>

        <Step n={4} done={!!account} title="Conectar o Instagram">
          {account ? (
            <>
              <div className="profile">
                {account.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.picture} alt="" />
                ) : (
                  <div className="avatar">{(account.username || "?").charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <b>@{account.username}</b>
                  <div className="hint" style={{ marginTop: 0 }}>
                    Acesso válido por mais {daysLeft} dias (renova sozinho todo dia).
                  </div>
                </div>
              </div>
              <div className="actions-bar" style={{ marginTop: 12 }}>
                <a className="btn btn-ghost btn-small" href="/api/instagram/connect">
                  Reconectar
                </a>
                <DisconnectButton />
              </div>
            </>
          ) : (
            <>
              <p>Use a conta profissional do Instagram. Ela precisa ser testadora do app enquanto ele estiver em modo desenvolvimento.</p>
              <div className="actions-bar" style={{ marginTop: 10 }}>
                {keysOk ? (
                  <a className="btn" href="/api/instagram/connect">
                    Conectar Instagram
                  </a>
                ) : (
                  <span className="hint">Complete o passo 2 primeiro.</span>
                )}
              </div>
            </>
          )}
        </Step>

        <Step n={5} done={!!lastWebhook} title="Receber um aviso do Instagram">
          {lastWebhook ? (
            <p>
              Último aviso recebido: <b>{fmtDateTime(lastWebhook)}</b> ({ago(lastWebhook)}).
            </p>
          ) : (
            <p>
              Ainda não chegou nenhum aviso. Depois de conectar, comente a palavra-chave em um post de teste (de outra
              conta). Veja o que aconteceu em <Link href="/atividade?aba=registro">Atividade → Registro técnico</Link>.
            </p>
          )}
          {lastEvent && !lastWebhook && <p className="hint">Última atividade: {ago(lastEvent.created_at)}.</p>}
        </Step>
      </div>

      <div className="card">
        <h2>Dados de contato (opcional)</h2>
        <p className="sub">
          {contact
            ? `O e-mail ${contact} aparece nas páginas de privacidade e exclusão de dados.`
            : "Defina CONTACT_EMAIL na Vercel para mostrar seu e-mail nas páginas de privacidade e exclusão de dados."}
        </p>
      </div>
    </>
  );
}
