import Link from "next/link";
import { notFound } from "next/navigation";
import AutomationForm from "@/components/AutomationForm";
import DbError from "@/components/DbError";
import { type AutomationInput } from "@/lib/automation-input";
import { q, type Automation } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditarAutomacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();

  let rows: Automation[];
  try {
    rows = await q<Automation>("SELECT * FROM automations WHERE id = $1", [n]);
  } catch (e) {
    return <DbError message={e instanceof Error ? e.message : String(e)} />;
  }
  const a = rows[0];
  if (!a) notFound();

  const initial: AutomationInput = {
    name: a.name,
    active: a.active,
    media_id: a.media_id,
    media_permalink: a.media_permalink,
    media_thumb: a.media_thumb,
    media_caption: a.media_caption,
    keywords: a.keywords,
    match_any: a.match_any,
    public_replies: a.public_replies,
    opening_text: a.opening_text,
    opening_button: a.opening_button,
    require_follow: a.require_follow,
    not_following_text: a.not_following_text,
    not_following_button: a.not_following_button,
    final_text: a.final_text,
    link_url: a.link_url,
    link_button: a.link_button,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar automação</h1>
          <p className="sub">
            <Link href="/">← Voltar para as automações</Link>
          </p>
        </div>
      </div>
      <AutomationForm id={n} initial={initial} />
    </>
  );
}
