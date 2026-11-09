import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import LandingPage from "@/components/LandingPage";
import { getCurrentUser } from "@/lib/auth";

function isDesktop(userAgent: string | null, cookieStore: { get: (n: string) => { value: string } | undefined }): boolean {
  if (/Electron/i.test(userAgent ?? "")) return true;
  return cookieStore.get("scrum-platform")?.value === "desktop";
}

export default async function LandingRoute() {
  const ua = (await headers()).get("user-agent");
  const cookieStore = await cookies();
  const current = await getCurrentUser();

  // The desktop app has no landing page: signed-out users go straight to sign-in.
  if (isDesktop(ua, cookieStore) && !current) {
    redirect("/login");
  }

  return <LandingPage />;
}
