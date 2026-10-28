"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DisconnectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm("Desconectar o Instagram? As automações param de funcionar até você conectar de novo.")) return;
    setBusy(true);
    await fetch("/api/instagram/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-danger btn-small" onClick={go} disabled={busy}>
      Desconectar
    </button>
  );
}
