import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PortfolioClient } from "@/components/PortfolioClient";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/join");

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "32px 24px",
        minHeight: "100dvh",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}
        >
          <Logo size={36} />
          <span className="display" style={{ fontSize: "1.5rem" }}>XX</span>
        </Link>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link href="/arena" className="btn" style={{ textDecoration: "none" }}>
            Arena
          </Link>
          <Link href={`/u/${user.handle}`} className="btn" style={{ textDecoration: "none" }}>
            Herkese açık profil
          </Link>
        </nav>
      </div>

      <PortfolioClient
        name={user.name}
        handle={user.handle}
        image={user.image}
        bio={user.bio}
      />
    </main>
  );
}
