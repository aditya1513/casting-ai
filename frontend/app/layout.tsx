import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/layout/navigation";
import { Providers } from "./providers";
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
  title: "CastMatch - Mumbai's Premier Casting Platform",
  description: "Connect actors with casting directors for OTT projects in Mumbai. Find your next role or discover talent for your production.",
  keywords: "casting, actors, Mumbai, OTT, entertainment, auditions, talent",
  authors: [{ name: "CastMatch" }],
  creator: "CastMatch",
  publisher: "CastMatch",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  metadataBase: new URL('https://castmatch.app'),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CastMatch"
  },
  applicationName: "CastMatch",
  openGraph: {
    title: "CastMatch - Elite Casting Platform",
    description: "AI-powered casting platform for Mumbai's entertainment industry",
    url: "https://castmatch.app",
    siteName: "CastMatch",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CastMatch Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "CastMatch - Elite Casting Platform",
    description: "AI-powered casting platform for Mumbai's entertainment industry",
    images: ["/twitter-image.png"]
  },
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/icons/apple-touch-icon-76x76.png", sizes: "76x76", type: "image/png" }
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#8b5cf6" }
    ]
  }
};

// Separate viewport export as required by Next.js 15
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8b5cf6" },
    { media: "(prefers-color-scheme: dark)", color: "#8b5cf6" }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
