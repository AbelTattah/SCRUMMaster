import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaRegister } from "@/components/PwaRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Scrum Master",
    template: "%s — Scrum Master",
  },
  description: "Scrum Master — tasks, reminders and your team in one place.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scrum Master",
  },
  other: {
    // iOS reads the legacy tag; the standard one above covers everyone else.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#21005D",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
