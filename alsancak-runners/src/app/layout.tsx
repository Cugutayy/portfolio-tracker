import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import { SessionProvider } from "next-auth/react";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0B0B",
};

export const metadata: Metadata = {
  title: "ALSANCAK RUNNERS — Run The City",
  description:
    "Alsancak Runners is an urban running collective based in Izmir. Running connects people to the city.",
  keywords: ["running", "Izmir", "Alsancak", "urban running", "collective", "koşu", "İzmir"],
  openGraph: {
    title: "ALSANCAK RUNNERS",
    description: "Urban running collective — Izmir, Turkey",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <SessionProvider>
          <CustomCursor />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
