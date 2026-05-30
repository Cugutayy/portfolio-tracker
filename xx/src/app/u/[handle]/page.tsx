import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPublicProfile } from "@/lib/portfolio";
import { ProfileView } from "@/components/ProfileView";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const me = await getCurrentUser();
  const profile = await getPublicProfile(handle, me?.id ?? null);
  if (!profile) notFound();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px", minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
          <Logo size={36} />
          <span className="display" style={{ fontSize: "1.5rem" }}>XX</span>
        </Link>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link href="/arena" className="btn" style={{ textDecoration: "none" }}>Arena</Link>
          {me ? (
            <Link href="/portfolio" className="btn" style={{ textDecoration: "none" }}>Portföyüm</Link>
          ) : (
            <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none" }}>Yarışa katıl</Link>
          )}
        </nav>
      </div>

      <ProfileView initial={profile} loggedIn={!!me} />
    </main>
  );
}
