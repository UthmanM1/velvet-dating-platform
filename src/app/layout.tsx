import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VELVET — Connections Without Boundaries.", template: "%s · VELVET" },
  description: "VELVET is a premium, discreet dating platform for verified adults aged 18 and over.",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#0b090a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-champagne focus:px-3 focus:py-2 focus:text-ink">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
