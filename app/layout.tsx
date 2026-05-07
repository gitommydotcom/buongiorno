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
        <div className="liquid-bg" aria-hidden />
        <svg className="liquid-svg" aria-hidden>
          <defs>
            <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise" />
              <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
              <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="60" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <main
          className="mx-auto w-full max-w-2xl px-4 pt-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
        >
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
