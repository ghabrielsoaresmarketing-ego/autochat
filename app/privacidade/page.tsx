import { envStatus } from "@/lib/config";

export const metadata = { title: "Política de Privacidade — AutoDM", robots: { index: true } };

export default function PrivacidadePage() {
  const { contactEmail } = envStatus();
  return (
    <main className="legal">
      <h1>Política de Privacidade</h1>
      <p className="updated">Última atualização: outubro de 2026</p>

      <p>
        O <b>AutoDM</b> é uma ferramenta de uso pessoal que responde automaticamente, por mensagem direta (DM) no
        Instagram, a pessoas que comentam determinadas palavras-chave em publicações da conta conectada. Esta página
        explica quais dados são tratados e como.
      </p>

      <h2>Quais dados são tratados</h2>
      <ul>
        <li>
          <b>Da conta conectada:</b> identificador, nome de usuário, nome e foto do perfil e o token de acesso
          fornecido pelo Instagram, usado apenas para executar as automações.
        </li>
        <li>
          <b>De quem interage:</b> identificador do Instagram, nome de usuário, o texto do comentário, se a pessoa
          segue a conta e o andamento da conversa automática (por exemplo, “link entregue”).
        </li>
        <li>
          <b>Registros técnicos:</b> histórico do que o sistema fez (envios, erros), apagado automaticamente após 30
          dias.
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <p>
        Somente para enviar a mensagem configurada pelo dono da conta, verificar se a pessoa segue o perfil (quando a
        automação exige) e mostrar o histórico no painel privado. Não vendemos, não compartilhamos e não usamos esses
        dados para publicidade.
      </p>

      <h2>Onde ficam guardados</h2>
      <p>
        Em um banco de dados Postgres privado, hospedado em provedores de nuvem, com acesso restrito ao dono da conta
        por senha. A comunicação com o Instagram usa conexão segura (HTTPS).
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Os dados das pessoas e das automações permanecem até serem apagados pelo dono ou a pedido do titular. O
        acesso à conta é apagado ao desconectar o Instagram no painel.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento. Veja como em{" "}
        <a href="/exclusao-de-dados">Exclusão de dados</a>.
      </p>

      <h2>Contato</h2>
      <p>
        {contactEmail ? (
          <>
            Fale com o responsável: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </>
        ) : (
          "Fale com o responsável pelo perfil do Instagram que enviou a mensagem."
        )}
      </p>
    </main>
  );
}
