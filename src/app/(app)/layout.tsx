import { Suspense, type ReactNode } from "react";

import { Sidebar, Tabbar, Topbar } from "@/components/AppShell";
import { BrowserNotifications } from "@/components/BrowserNotifications";
import { CryptoGate } from "@/components/CryptoGate";
import { FlashToast } from "@/components/FlashToast";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { countTodos } from "@/lib/data/todos";
import { notificationsForUser } from "@/lib/data/notifications";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Signed-out visitors get no shell: each page decides what happens next.
  // "/" sends them silently to the sign-in screen, the other routes ask them
  // to sign in with a notice (see their own requireOnboardedUser guards).
  const guest = !(await getCurrentUser());

  if (guest) {
    return <>{children}</>;
  }

  const user = await requireOnboardedUser();
  const [counts, notifications] = await Promise.all([
    countTodos(user.id),
    notificationsForUser(user.profile),
  ]);
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <CryptoGate
      user={{
        id: user.id,
        email: user.email,
        name: user.profile.name,
        isOwner: user.isOwner,
        inOrg: Boolean(user.organization),
        hasPassword: user.hasPassword,
      }}
    >
      <Suspense fallback={null}>
        <Sidebar user={user} counts={counts} />
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
    </CryptoGate>
  );
}
