/** Minúsculas e sem acentos */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => normalize(k).trim())
    .filter(Boolean);
}

/** Palavra inteira, sem diferenciar maiúsculas e acentos. Várias palavras separadas por vírgula. */
export function matchesKeywords(comment: string, keywords: string): string | null {
  const text = normalize(comment);
  for (const k of splitKeywords(keywords)) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(k)}($|[^a-z0-9])`, "i");
    if (re.test(text)) return k;
  }
  return null;
}

/** {usuario} vira @username */
export function fill(text: string, username?: string | null): string {
  const who = username ? `@${username}` : "";
  return text.replace(/\{usuario\}/gi, who).replace(/[ \t]+\n/g, "\n").trim();
}

export function pickLine(lines: string): string | null {
  const arr = lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function shorten(s: string, max = 60): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
