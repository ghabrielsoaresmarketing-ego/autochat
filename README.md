# AutoDM 💜

Automação de DMs do Instagram para uso pessoal: a pessoa **comenta a palavra-chave** no seu post → recebe uma **DM com botão** → (opcional) o app confere se ela **segue você** → entrega o **link** por DM.

Next.js (App Router) + Postgres (Neon) na Vercel. Instagram API com login do Instagram (`graph.instagram.com/v23.0`).

## Variáveis de ambiente

| Variável | Para quê |
| --- | --- |
| `ADMIN_PASSWORD` | Senha do painel (cookie válido por 90 dias) |
| `INSTAGRAM_APP_ID` | ID do app do Instagram (painel da Meta) |
| `INSTAGRAM_APP_SECRET` | Segredo do app do Instagram (também valida a assinatura do webhook) |
| `DATABASE_URL` | Criada sozinha ao conectar um banco Neon na Vercel |
| `CONTACT_EMAIL` | (opcional) e-mail mostrado em /privacidade e /exclusao-de-dados |

O *verify token* do webhook é gerado sozinho a partir do segredo e aparece em **Configuração**. A URL base vem de `VERCEL_PROJECT_PRODUCTION_URL`.

## Passo a passo na Meta

1. Entre em <https://developers.facebook.com/apps> → **Criar app** → tipo **Empresa** (Business) → adicione o produto **Instagram** → **API com login do Instagram**.
2. Em **Configuração da API com login do Instagram**, copie o **ID do app do Instagram** e o **Segredo do app do Instagram** para `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` na Vercel e faça um novo deploy.
3. Abra o painel do AutoDM → **Configuração**: lá estão os endereços prontos para copiar:
   - **Webhook**: URL de callback + verify token; assine `comments`, `messages` e `messaging_postbacks`.
   - **Login com o Instagram → URI de redirecionamento do OAuth**.
   - **Configurações do app → Básico**: URL da política de privacidade e URL de exclusão de dados.
4. Em **Funções do app → Funções**, adicione sua conta do Instagram como **Testador do Instagram** e aceite o convite em *Instagram → Configurações → Apps e sites → Convites de testador*.
5. No AutoDM → **Configuração** → **Conectar Instagram**.
6. Crie uma automação e teste comentando de **outra conta** (a própria conta é ignorada).

> Enquanto o app estiver em modo desenvolvimento, só contas com função no app (você e testadores) disparam e recebem mensagens. Para uso pessoal isso basta. Para atender o público geral é preciso a **Análise do app** (App Review) da Meta com as permissões `instagram_business_manage_messages` e `instagram_business_manage_comments`.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha ADMIN_PASSWORD
npm run dev
```

Sem `DATABASE_URL`, o app usa um banco de arquivo em `.data/` (PGlite). Na Vercel, sem banco, o painel mostra um erro claro.

## Como funciona

- `app/api/webhook` valida `X-Hub-Signature-256` e processa comentários, cliques e respostas em texto de forma síncrona.
- `lib/flow.ts` tem a lógica do fluxo (palavra-chave sem acento e por palavra inteira; post específico tem prioridade; sem duplicados por `comment_id`).
- `app/api/cron/refresh` roda todo dia (`vercel.json`): renova o token (60 dias) quando tem 7 dias ou mais e apaga eventos com mais de 30 dias.
- Tudo o que acontece vai para o **Registro técnico** em linguagem simples.
