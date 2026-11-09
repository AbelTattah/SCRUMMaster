import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";

import { Sidebar, Tabbar, Topbar } from "@/components/AppShell";
import { BrowserNotifications } from "@/components/BrowserNotifications";
import { CryptoGate } from "@/components/CryptoGate";
import { FlashToast } from "@/components/FlashToast";
import { OfflineSessionSync } from "@/components/OfflineSessionSync";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import type { Counts, NotificationItem } from "@/lib/types";
import { countTodos } from "@/lib/data/todos";
import { notificationsForUser } from "@/lib/data/notifications";
import { safeServer } from "@/lib/netSafe";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const isGuest = cookieStore.get("scrum-guest")?.value === "1";
  const current = await getCurrentUser();

  // Signed-out visitors get no shell: each page decides what happens next.
  // "/" sends them silently to the sign-in screen, the other routes ask them
  // to sign in with a notice (see their own requireOnboardedUser guards).
  if (!current && !isGuest) {
    return <>{children}</>;
  }

  const user = current
    ? await requireOnboardedUser()
    : {
        id: "guest",
        email: "",
        profile: {
          id: "guest",
          name: "Guest",
          email: "",
          avatar_url: null,
          organization_id: null,
          notify_browser: false,
          notify_email: false,
          notify_lead_minutes: 0,
          onboarding_complete: true,
          xp: 0,
          created_at: new Date().toISOString(),
          invited_at: null,
        },
        organization: null,
        isOwner: false,
        hasPassword: false,
      };

  const [counts, notifications] = current
    ? await Promise.all([
        safeServer(() => countTodos(user.id), { completed: 0, in_progress: 0 } as Counts),
        safeServer(() => notificationsForUser(user.profile), [] as NotificationItem[]),
      ])
    : ([{ completed: 0, in_progress: 0 }, []] as [Counts, NotificationItem[]]);

  const unread = notifications.filter((item) => !item.read).length;

  const shell = (
    <>
      {current ? <OfflineSessionSync user={current} /> : null}
      <Suspense fallback={null}>
        <Sidebar user={user} counts={counts} isGuest={isGuest && !current} />
      </Suspense>

      <div className="main">
        <Suspense fallback={null}>
          <Topbar user={user} unread={unread} notifications={notifications} />
        </Suspense>

        <main className="content">{children}</main>
      </div>

      <Suspense fallback={null}>
        <Tabbar user={user} counts={counts} />
      </Suspense>

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>

      {user.profile.notify_browser ? <BrowserNotifications /> : null}
    </>
  );

  if (isGuest) {
    return shell;
  }

  return <CryptoGate user={{ id: user.id, email: user.email, name: user.profile.name, isOwner: user.isOwner, inOrg: Boolean(user.organization), hasPassword: user.hasPassword }}>{shell}</CryptoGate>;
}
