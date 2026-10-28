"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleBadge({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`badge ${active ? "badge-ok" : "badge-off"}`}
      onClick={toggle}
      disabled={busy}
      title={active ? "Clique para pausar" : "Clique para ativar"}
    >
      {active ? "● Ativa" : "❚❚ Pausada"}
    </button>
  );
}
