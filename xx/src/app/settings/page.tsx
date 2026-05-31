import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PasswordForm } from "@/components/PasswordForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/join");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 72px", minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
          <span className="display" style={{ fontSize: "1.5rem" }}>XX</span>
          <span className="eyebrow" style={{ letterSpacing: ".28em" }}>Arena</span>
        </Link>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/portfolio" className="btn" style={{ textDecoration: "none" }}>Portföyüm</Link>
          <LogoutButton />
        </nav>
      </div>

      <h1 className="display" style={{ fontSize: "clamp(2rem,5vw,2.8rem)", margin: "0 0 24px" }}>Ayarlar</h1>

      {/* account */}
      <section className="glass" style={{ padding: 24, marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Hesap</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">E-posta</span>
          <span className="mono" style={{ fontSize: ".95rem" }}>{user.email}</span>
          <span style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
            Bu bilgiyi yalnızca sen görürsün. Başka kullanıcılar e-postanı göremez.
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 18 }}>
          <span className="eyebrow">Kullanıcı adı</span>
          <span className="mono" style={{ fontSize: ".95rem" }}>@{user.handle}</span>
        </div>
      </section>

      {/* appearance */}
      <section className="glass" style={{ padding: 24, marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Görünüm</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: ".9rem", color: "var(--ink-soft)" }}>Aydınlık / karanlık tema</span>
          <ThemeToggle />
        </div>
      </section>

      {/* password */}
      <section className="glass" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Şifre değiştir</div>
        <PasswordForm />
      </section>
    </main>
  );
}
