import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { PortfolioClient } from "@/components/PortfolioClient";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
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
      <AppHeader loggedIn locale={locale} handle={user.handle} />

      <PortfolioClient
        name={user.name}
        handle={user.handle}
        image={user.image}
        bio={user.bio}
      />
    </main>
  );
}
