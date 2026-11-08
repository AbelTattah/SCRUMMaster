import { headers } from "next/headers";
import { redirect } from "next/navigation";

import LandingPage from "@/components/LandingPage";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingRoute() {
  const ua = (await headers()).get("user-agent");
  const isDesktop = /Electron/i.test(ua ?? "");
  const current = await getCurrentUser();

  // The desktop app has no landing page: signed-out users go straight to sign-in.
  if (isDesktop && !current) {
    redirect("/login");
  }

  return <LandingPage />;
}
