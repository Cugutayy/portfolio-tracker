import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { getPublicProfile } from "@/lib/portfolio";
import { ProfileView } from "@/components/ProfileView";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const p = await getPublicProfile(handle, null).catch(() => null);
  if (!p) return { title: "Profil — XX Arena" };
  const sign = p.returnPct >= 0 ? "+" : "";
  const title = `${p.name} (@${p.handle}) — XX Arena`;
  const description = `Sıra #${p.rank} · ${sign}${p.returnPct.toFixed(1)}% getiri · sanal trader arenası`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [me, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const profile = await getPublicProfile(handle, me?.id ?? null);
  if (!profile) notFound();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px", minHeight: "100dvh" }}>
      <AppHeader loggedIn={!!me} locale={locale} handle={me?.handle} />

      <ProfileView initial={profile} loggedIn={!!me} />
    </main>
  );
}
