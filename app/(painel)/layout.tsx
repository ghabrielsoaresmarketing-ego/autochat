import Nav from "@/components/Nav";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="shell">
      <Nav />
      <main className="container">{children}</main>
    </div>
  );
}
