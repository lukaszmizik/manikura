import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Manikúra – Rezervace & Galerie",
  description: "Rezervace termínů manikúry, fotogalerie a inspirace.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Manikúra" },
};

export const viewport: Viewport = {
  themeColor: "#cb3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased md:bg-neutral-200 dark:md:bg-neutral-900">
        {children}
      </body>
    </html>
  );
}
