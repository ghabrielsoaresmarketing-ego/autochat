import { envStatus } from "@/lib/config";

export const metadata = { title: "Exclusão de Dados — AutoDM", robots: { index: true } };

export default function ExclusaoPage() {
  const { contactEmail } = envStatus();
  return (
    <main className="legal">
      <h1>Exclusão de dados</h1>
      <p className="updated">Última atualização: outubro de 2026</p>

      <p>
        Você pode pedir a exclusão dos dados que o <b>AutoDM</b> guardou sobre você a qualquer momento. Veja abaixo
        como fazer.
      </p>

      <h2>Se você comentou ou conversou com o perfil</h2>
      <ol>
        <li>
          Envie um e-mail
          {contactEmail ? (
            <>
              {" "}
              para <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          ) : (
            " ao responsável pelo perfil"
          )}{" "}
          com o assunto “Excluir meus dados”, informando seu @ do Instagram.
        </li>
        <li>Apagamos seu nome de usuário, seus comentários e o histórico de mensagens em até 30 dias.</li>
        <li>Você recebe uma confirmação quando a exclusão for concluída.</li>
      </ol>

      <h2>Se você é o dono da conta conectada</h2>
      <ol>
        <li>No painel, abra <b>Configuração</b> e clique em <b>Desconectar</b>. O token de acesso é apagado na hora.</li>
        <li>
          No Instagram, vá em <b>Configurações → Apps e sites</b> (ou “Aplicativos e sites”) e remova o AutoDM.
        </li>
        <li>Para apagar também o histórico guardado, peça pelo e-mail acima ou exclua o banco de dados no provedor.</li>
      </ol>

      <h2>O que acontece automaticamente</h2>
      <p>Registros técnicos com mais de 30 dias são apagados sozinhos todos os dias.</p>
    </main>
  );
}
