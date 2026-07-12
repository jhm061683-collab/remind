import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SITE_DESCRIPTION } from "@/lib/constants/brand-copy";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription = SITE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Re:mind",
    template: "%s | Re:mind",
  },
  description: siteDescription,
  applicationName: "Re:mind",
  appleWebApp: {
    capable: true,
    title: "Re:mind",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/pwa-icon/192", type: "image/png", sizes: "192x192" },
      { url: "/pwa-icon/512", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/icon",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "Re:mind",
    title: "Re:mind",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Re:mind",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
        <ServiceWorkerRegister />
        <InstallAppPrompt variant="banner" />
      </body>
    </html>
  );
}
