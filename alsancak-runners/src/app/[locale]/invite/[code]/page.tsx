import { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ locale: string; code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: "Rota App - Davet",
    description: "Alsancak Runners topluluğuna katıl!",
    openGraph: {
      title: "Rota App - Davet",
      description: "Alsancak Runners topluluğuna katıl ve birlikte koşmaya başla!",
      type: "website",
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const { locale, code } = await params;

  // Validate invite code
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://alsancak-runners.vercel.app";
  let valid = false;
  let error = "";

  try {
    const res = await fetch(`${baseUrl}/api/invites?code=${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    valid = data.valid === true;
    error = data.error || "";
  } catch {
    error = "Sunucu hatasi";
  }

  const isIOS = false; // Server-side, can't detect — show both
  const appStoreUrl = "#"; // Placeholder until App Store listing
  const playStoreUrl = "#"; // Placeholder until Play Store listing
  const expoUrl = `exp://u.expo.dev/update/rota-app`;
  const deepLink = `rota://invite/${code}`;

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a2e] rounded-2xl p-8 text-center shadow-2xl border border-[#E6FF00]/20">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-[#E6FF00] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-[#0A0A0A] text-3xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ROTA APP</h1>
          <p className="text-[#E6FF00] text-sm mt-1">by Alsancak Runners</p>
        </div>

        {valid ? (
          <>
            {/* Valid invite */}
            <div className="mb-6">
              <div className="text-5xl mb-3">🏃‍♂️</div>
              <h2 className="text-xl text-white font-semibold mb-2">
                {locale === "tr" ? "Topluluğa Davet Edildin!" : "You're Invited!"}
              </h2>
              <p className="text-gray-400 text-sm">
                {locale === "tr"
                  ? "Alsancak Runners topluluğuna katıl, birlikte koşmaya başla."
                  : "Join Alsancak Runners community and start running together."}
              </p>
            </div>

            {/* Invite code display */}
            <div className="bg-[#0A0A0A] rounded-lg p-3 mb-6">
              <span className="text-gray-500 text-xs block mb-1">
                {locale === "tr" ? "Davet Kodu" : "Invite Code"}
              </span>
              <span className="text-[#E6FF00] text-2xl font-mono font-bold tracking-widest">{code}</span>
            </div>

            {/* Download buttons */}
            <div className="space-y-3 mb-6">
              <a
                href={deepLink}
                className="block w-full bg-[#E6FF00] text-[#0A0A0A] font-bold py-3 px-6 rounded-xl hover:bg-[#d4eb00] transition-colors"
              >
                {locale === "tr" ? "Uygulamayı Aç" : "Open App"}
              </a>

              <div className="flex gap-3">
                <a
                  href={appStoreUrl}
                  className="flex-1 bg-white/10 text-white py-3 px-4 rounded-xl hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  App Store
                </a>
                <a
                  href={playStoreUrl}
                  className="flex-1 bg-white/10 text-white py-3 px-4 rounded-xl hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  Google Play
                </a>
              </div>
            </div>

            {/* Expo Go instruction */}
            <div className="bg-[#0A0A0A] rounded-lg p-4 text-left">
              <p className="text-gray-500 text-xs mb-2">
                {locale === "tr" ? "Şimdilik Expo Go ile:" : "For now with Expo Go:"}
              </p>
              <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
                <li>{locale === "tr" ? "Expo Go uygulamasını indir" : "Download Expo Go app"}</li>
                <li>{locale === "tr" ? "Kayıt olurken bu kodu gir" : "Enter this code during signup"}</li>
                <li>
                  <span className="text-[#E6FF00] font-mono">{code}</span>
                </li>
              </ol>
            </div>
          </>
        ) : (
          <>
            {/* Invalid invite */}
            <div className="mb-6">
              <div className="text-5xl mb-3">😕</div>
              <h2 className="text-xl text-white font-semibold mb-2">
                {locale === "tr" ? "Geçersiz Davet" : "Invalid Invite"}
              </h2>
              <p className="text-gray-400 text-sm">
                {error || (locale === "tr" ? "Bu davet kodu geçersiz veya süresi dolmuş." : "This invite code is invalid or expired.")}
              </p>
            </div>

            {/* Still show app link */}
            <a
              href={`/${locale}/join`}
              className="block w-full bg-[#E6FF00] text-[#0A0A0A] font-bold py-3 px-6 rounded-xl hover:bg-[#d4eb00] transition-colors"
            >
              {locale === "tr" ? "Yine de Katıl" : "Join Anyway"}
            </a>
          </>
        )}

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-6">alsancakrunners.com</p>
      </div>
    </main>
  );
}
