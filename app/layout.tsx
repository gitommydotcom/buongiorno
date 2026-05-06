import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Buongiorno",
  description: "Il tuo riassunto quotidiano personalizzato",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Buongiorno",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
