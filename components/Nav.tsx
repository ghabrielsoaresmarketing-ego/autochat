"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Automações", ico: "⚡" },
  { href: "/atividade", label: "Atividade", ico: "💬" },
  { href: "/configuracao", label: "Configuração", ico: "⚙️" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/automacoes");
  return path.startsWith(href);
}

export default function Nav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-dot">💜</span> AutoDM
          </Link>
          <nav className="nav-desktop">
            {ITEMS.map((i) => (
              <Link key={i.href} href={i.href} className={isActive(path, i.href) ? "active" : ""}>
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="topbar-spacer" />
          <button className="logout" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <nav className="nav-bottom">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={isActive(path, i.href) ? "active" : ""}>
            <span className="ico">{i.ico}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
