import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { isLogged } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isLogged()) redirect("/");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">💜</div>
        <h1>AutoDM</h1>
        <p className="sub">Entre para gerenciar suas automações do Instagram.</p>
        <LoginForm />
      </div>
    </div>
  );
}
