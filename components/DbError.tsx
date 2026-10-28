export default function DbError({ message }: { message: string }) {
  return (
    <div className="card">
      <h2>😕 Problema com o banco de dados</h2>
      <p className="sub">{message}</p>
      <p className="sub">
        Veja o passo a passo em <a href="/configuracao">Configuração</a>.
      </p>
    </div>
  );
}
