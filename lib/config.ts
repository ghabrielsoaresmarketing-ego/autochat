import crypto from "node:crypto";
import { headers } from "next/headers";

export const IG_VERSION = "v23.0";
export const IG_GRAPH = `https://graph.instagram.com/${IG_VERSION}`;

export const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

/** Segredos aceitos para validar a assinatura do webhook */
export function appSecrets(): string[] {
  return [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET].filter(
    (s): s is string => !!s,
  );
}

/** "Verify token" do webhook: gerado sozinho a partir do segredo do app */
export function verifyToken(): string {
  const secret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || "";
  if (!secret) return "";
  return crypto
    .createHash("sha256")
    .update("autodm-verify:" + secret)
    .digest("hex")
    .slice(0, 24);
}

/** URL base do site (fixa em produção, para as URLs cadastradas na Meta não mudarem) */
export async function getBaseUrl(req?: Request): Promise<string> {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return "https://" + prod.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (req) {
    const u = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") || u.host;
    const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* fora de uma requisição */
  }
  if (process.env.VERCEL_URL) return "https://" + process.env.VERCEL_URL;
  return "http://localhost:3000";
}

export function envStatus() {
  return {
    adminPassword: !!process.env.ADMIN_PASSWORD,
    appId: !!process.env.INSTAGRAM_APP_ID,
    appSecret: !!(process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET),
    database: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    contactEmail: process.env.CONTACT_EMAIL || "",
  };
}
