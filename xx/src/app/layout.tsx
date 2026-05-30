import type { Metadata } from "next";
import "./globals.css";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "XX — Trader Arena",
  description:
    "Traderların 1.000.000 ₺ sanal portföyle yarıştığı premium sosyal yatırım platformu. Gerçek piyasa fiyatları.",
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
