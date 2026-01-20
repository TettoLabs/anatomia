import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { LandingNav } from "@/components/LandingNav";
import { LandingFooter } from "@/components/LandingFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anatomia - AI that understands your codebase",
  description: "Auto-generated context that stays current. Federated nodes for teams. Built for Claude Code, Cursor, and Windsurf.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon - must be in head for immediate browser recognition */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" sizes="180x180" type="image/svg+xml" />
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Skip links for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#pricing" className="skip-link" style={{ left: "calc(50% + 200px)" }}>
          Skip to pricing
        </a>

        <Providers>
          <LandingNav />
          <main id="main-content" className="flex-1" role="main">
            {children}
          </main>
          <LandingFooter />
        </Providers>
      </body>
    </html>
  );
}
