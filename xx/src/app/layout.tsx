import type { Metadata } from "next";
import "./globals.css";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { Providers } from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const TITLE = "XX Arena";
const DESCRIPTION =
  "Traderların 1.000.000 ₺ sanal portföyle yarıştığı premium sosyal yatırım platformu. Gerçek piyasa fiyatları.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: { default: TITLE, template: "%s · XX" },
  description: DESCRIPTION,
  applicationName: "XX",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "XX",
    locale: "tr_TR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AmbientOrbs />
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}
