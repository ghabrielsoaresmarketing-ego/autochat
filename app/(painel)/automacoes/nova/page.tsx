import Link from "next/link";
import AutomationForm from "@/components/AutomationForm";
import { DEFAULTS } from "@/lib/automation-input";

export const dynamic = "force-dynamic";

export default function NovaAutomacaoPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Nova automação</h1>
          <p className="sub">
            Preencha as 7 etapas. Já deixei textos prontos para você só ajustar. <Link href="/">Voltar</Link>
          </p>
        </div>
      </div>
      <AutomationForm initial={DEFAULTS} />
    </>
  );
}
