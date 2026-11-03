import { Suspense, type ReactNode } from "react";

import { Sidebar, Tabbar, Topbar } from "@/components/AppShell";
import { BrowserNotifications } from "@/components/BrowserNotifications";
import { FlashToast } from "@/components/FlashToast";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { unreadNotificationCount } from "@/lib/data/notifications";
import { countTodos } from "@/lib/data/todos";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Signed-out visitors only ever reach "/" inside this group, where the
  // page renders the public landing page — no shell, no redirect. Every
  // other route below guards itself with requireOnboardedUser().
  const guest = !(await getCurrentUser());

  if (guest) {
    return <>{children}</>;
  }

  const user = await requireOnboardedUser();
  const [counts, unread] = await Promise.all([
    countTodos(user.id),
    unreadNotificationCount(user.profile),
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <Sidebar user={user} counts={counts} />
      </Suspense>

      <div className="main">
        <Suspense fallback={null}>
          <Topbar user={user} unread={unread} />
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
}
