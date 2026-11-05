import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#21005D",
};

// Applies the stored theme before first paint so the right palette is there
// from frame one (no flash). System preference is handled purely in CSS.
const THEME_INIT = `try{var t=localStorage.getItem("scrum-master.theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t;}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
