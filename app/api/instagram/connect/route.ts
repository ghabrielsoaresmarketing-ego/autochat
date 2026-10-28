import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { apiAuthed } from "@/lib/auth";
import { getBaseUrl, SCOPES } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = await getBaseUrl(req);
  if (!apiAuthed(req)) return NextResponse.redirect(`${base}/login`);

  const clientId = process.env.INSTAGRAM_APP_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${base}/configuracao?erro=${encodeURIComponent("Falta definir INSTAGRAM_APP_ID na Vercel.")}`,
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${base}/api/instagram/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("autodm_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
