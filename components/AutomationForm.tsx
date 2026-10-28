"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AutomationInput } from "@/lib/automation-input";

interface MediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <div className={`counter ${value.length >= max ? "max" : ""}`}>
      {value.length}/{max}
    </div>
  );
}

function fillPreview(text: string): string {
  return text.replace(/\{usuario\}/gi, "@maria");
}

export default function AutomationForm({ id, initial }: { id?: number; initial: AutomationInput }) {
  const router = useRouter();
  const [f, setF] = useState<AutomationInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [mediaMode, setMediaMode] = useState<"any" | "one">(initial.media_id ? "one" : "any");

  function set<K extends keyof AutomationInput>(key: K, value: AutomationInput[K]) {
    setF((p) => ({ ...p, [key]: value }));
  }

  // Carrega os posts só quando a pessoa escolhe "post específico"
  useEffect(() => {
    if (mediaMode !== "one" || media !== null || mediaError) return;
    let cancelled = false;
    fetch("/api/media")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) setMediaError(d.error || "Não consegui buscar seus posts.");
        else setMedia(d.items ?? []);
      })
      .catch(() => !cancelled && setMediaError("Sem conexão ao buscar seus posts."));
    return () => {
      cancelled = true;
    };
  }, [mediaMode, media, mediaError]);

  function pickMedia(m: MediaItem) {
    if (f.media_id === m.id) {
      setF((p) => ({ ...p, media_id: null, media_permalink: null, media_thumb: null, media_caption: null }));
      return;
    }
    setF((p) => ({
      ...p,
      media_id: m.id,
      media_permalink: m.permalink ?? null,
      media_thumb: m.thumbnail_url || m.media_url || null,
      media_caption: m.caption ? m.caption.slice(0, 200) : null,
    }));
  }

  function chooseMediaMode(mode: "any" | "one") {
    setMediaMode(mode);
    if (mode === "any") {
      setF((p) => ({ ...p, media_id: null, media_permalink: null, media_thumb: null, media_caption: null }));
    }
  }

  async function save() {
    setError("");
    if (mediaMode === "one" && !f.media_id) {
      setError("Escolha um post na etapa 2 ou selecione “Qualquer post”.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(id ? `/api/automations/${id}` : "/api/automations", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Não foi possível salvar.");
        setSaving(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Sem conexão. Tente de novo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm("Excluir esta automação? As pessoas já atendidas por ela também saem do histórico.")) return;
    setSaving(true);
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const firstReply = f.public_replies.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
  const sampleWord = f.match_any ? "Quero saber mais!" : (f.keywords.split(",")[0] || "quero").trim();

  return (
    <div className="editor">
      <div>
        {/* 1 */}
        <div className="card">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-body">
              <h2>Nome e status</h2>
              <p className="sub">Só para você se organizar.</p>
              <div className="field">
                <input
                  className="input"
                  value={f.name}
                  maxLength={80}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex.: Link do e-book"
                />
              </div>
              <div className="switch-row" onClick={() => set("active", !f.active)} role="switch" aria-checked={f.active}>
                <div>
                  <div className="t">{f.active ? "Ativa" : "Pausada"}</div>
                  <div className="d">{f.active ? "Respondendo comentários agora." : "Não responde ninguém enquanto estiver pausada."}</div>
                </div>
                <div className={`switch ${f.active ? "on" : ""}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 2 */}
        <div className="card">
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-body">
              <h2>Em qual post?</h2>
              <p className="sub">Um post específico tem prioridade sobre “qualquer post”.</p>
              <div className="seg" style={{ marginTop: 12 }}>
                <button type="button" className={mediaMode === "any" ? "on" : ""} onClick={() => chooseMediaMode("any")}>
                  Qualquer post
                </button>
                <button type="button" className={mediaMode === "one" ? "on" : ""} onClick={() => chooseMediaMode("one")}>
                  Um post específico
                </button>
              </div>
              {mediaMode === "one" && (
                <>
                  {mediaError && <div className="alert alert-bad" style={{ marginTop: 12 }}>{mediaError}</div>}
                  {!mediaError && media === null && <p className="hint">Buscando seus posts…</p>}
                  {media && media.length === 0 && <p className="hint">Nenhum post encontrado na conta.</p>}
                  {media && media.length > 0 && (
                    <div className="media-grid">
                      {media.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          className={`media-item ${f.media_id === m.id ? "sel" : ""}`}
                          onClick={() => pickMedia(m)}
                          title={m.caption?.slice(0, 80) || "Post"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.thumbnail_url || m.media_url || ""} alt="" loading="lazy" />
                          {f.media_id === m.id && <span className="tick">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {f.media_id && !media?.some((m) => m.id === f.media_id) && (
                    <p className="hint">Post escolhido: {f.media_caption || f.media_id}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3 */}
        <div className="card">
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-body">
              <h2>Qual comentário dispara?</h2>
              <div className="seg" style={{ marginTop: 12 }}>
                <button type="button" className={!f.match_any ? "on" : ""} onClick={() => set("match_any", false)}>
                  Palavras-chave
                </button>
                <button type="button" className={f.match_any ? "on" : ""} onClick={() => set("match_any", true)}>
                  Qualquer comentário
                </button>
              </div>
              {!f.match_any && (
                <div className="field">
                  <label htmlFor="kw">Palavras-chave</label>
                  <input
                    id="kw"
                    className="input"
                    value={f.keywords}
                    maxLength={300}
                    onChange={(e) => set("keywords", e.target.value)}
                    placeholder="quero, link, eu quero"
                  />
                  <p className="hint">
                    Separe por vírgula. Não importa maiúscula ou acento, mas precisa ser a palavra inteira.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 */}
        <div className="card">
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-body">
              <h2>Respostas públicas (opcional)</h2>
              <p className="sub">Uma resposta no comentário. Escreva uma por linha: o AutoDM sorteia uma. Deixe vazio para não responder.</p>
              <div className="field">
                <textarea
                  className="textarea"
                  value={f.public_replies}
                  maxLength={1500}
                  onChange={(e) => set("public_replies", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5 */}
        <div className="card">
          <div className="step">
            <div className="step-num">5</div>
            <div className="step-body">
              <h2>Primeira mensagem (DM)</h2>
              <p className="sub">
                Use <b>{"{usuario}"}</b> para colocar o @ da pessoa. Essa mensagem tem um botão: é o clique que libera a conversa.
              </p>
              <div className="field">
                <label>Texto</label>
                <textarea className="textarea" value={f.opening_text} maxLength={640} onChange={(e) => set("opening_text", e.target.value)} />
                <Counter value={f.opening_text} max={640} />
              </div>
              <div className="field">
                <label>Texto do botão</label>
                <input className="input" value={f.opening_button} maxLength={20} onChange={(e) => set("opening_button", e.target.value)} />
                <Counter value={f.opening_button} max={20} />
              </div>
            </div>
          </div>
        </div>

        {/* 6 */}
        <div className="card">
          <div className="step">
            <div className="step-num">6</div>
            <div className="step-body">
              <h2>Exigir que siga o perfil</h2>
              <div className="switch-row" onClick={() => set("require_follow", !f.require_follow)} role="switch" aria-checked={f.require_follow}>
                <div>
                  <div className="t">{f.require_follow ? "Sim, só libera o link para quem segue" : "Não, enviar o link direto"}</div>
                  <div className="d">
                    {f.require_follow
                      ? "Quando a pessoa clica no botão, conferimos se ela segue você."
                      : "Sem exigir seguir, o link vai direto na primeira DM (pula a etapa 5)."}
                  </div>
                </div>
                <div className={`switch ${f.require_follow ? "on" : ""}`} />
              </div>
              {f.require_follow && (
                <>
                  <div className="field">
                    <label>Mensagem para quem ainda não segue</label>
                    <textarea className="textarea" value={f.not_following_text} maxLength={640} onChange={(e) => set("not_following_text", e.target.value)} />
                    <Counter value={f.not_following_text} max={640} />
                  </div>
                  <div className="field">
                    <label>Texto do botão</label>
                    <input className="input" value={f.not_following_button} maxLength={20} onChange={(e) => set("not_following_button", e.target.value)} />
                    <Counter value={f.not_following_button} max={20} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 7 */}
        <div className="card">
          <div className="step">
            <div className="step-num">7</div>
            <div className="step-body">
              <h2>Mensagem final com o link</h2>
              <div className="field">
                <label>Texto</label>
                <textarea className="textarea" value={f.final_text} maxLength={640} onChange={(e) => set("final_text", e.target.value)} />
                <Counter value={f.final_text} max={640} />
              </div>
              <div className="field">
                <label>Link</label>
                <input className="input" type="url" inputMode="url" value={f.link_url} onChange={(e) => set("link_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="field">
                <label>Texto do botão do link</label>
                <input className="input" value={f.link_button} maxLength={20} onChange={(e) => set("link_button", e.target.value)} />
                <Counter value={f.link_button} max={20} />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-bad" style={{ marginTop: 16 }}>⚠️ {error}</div>}
        <div className="actions-bar">
          <button type="button" className="btn" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : id ? "Salvar alterações" : "Criar automação"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/")} disabled={saving}>
            Cancelar
          </button>
          <div className="spacer" />
          {id && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={saving}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Prévia */}
      <div className="preview-wrap">
        <div className="phone">
          <div className="phone-head">📱 Prévia da conversa</div>
          <div className="phone-body">
            <div className="bubble comment">
              <b>@maria</b> comentou no post: {sampleWord}
            </div>
            {firstReply && (
              <div className="bubble comment" style={{ borderStyle: "solid" }}>
                <b>Você</b> respondeu: {fillPreview(firstReply)}
              </div>
            )}
            <div className="tag">Mensagem direta</div>
            {f.require_follow ? (
              <>
                <div className="bubble them">
                  {fillPreview(f.opening_text) || "…"}
                  {f.opening_button && <span className="bubble-btn">{f.opening_button}</span>}
                </div>
                <div className="bubble me">{f.opening_button || "…"}</div>
                <div className="tag">Se ainda não segue</div>
                <div className="bubble them">
                  {fillPreview(f.not_following_text) || "…"}
                  {f.not_following_button && <span className="bubble-btn">{f.not_following_button}</span>}
                </div>
                <div className="tag">Quando já segue</div>
              </>
            ) : null}
            <div className="bubble them">
              {fillPreview(f.final_text) || "…"}
              {f.link_button && <span className="bubble-btn">🔗 {f.link_button}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
