import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { saveNotificationSettings, sendTestEmail } from "@/app/actions/settings";
import { ConfirmForm } from "@/components/ConfirmForm";
import { PermissionPanel } from "@/components/PermissionPanel";
import { ThemeSetting } from "@/components/ThemeSetting";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { requireOnboardedUser } from "@/lib/auth";
import { mailIsConfigured, mailTransport } from "@/lib/mail";
import {
  NOTIFICATION_LEAD_OPTIONS,
  notificationLeadMinutes,
} from "@/lib/notifications";
import { formatMinutes } from "@/lib/time";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const raw = firstParam(params.tab);
  const tab = raw === "notifications" || raw === "access" ? raw : "appearance";
  const leadMinutes = notificationLeadMinutes(user.profile);
  const transport = mailTransport();
  const configured = mailIsConfigured();

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Settings</h1>
          <p className="date-line">Appearance, notifications and account access.</p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Settings sections">
        <Link
          className={`page-tab${tab === "appearance" ? " is-active" : ""}`}
          href="/settings?tab=appearance"
          aria-current={tab === "appearance" ? "page" : undefined}
        >
          Appearance
        </Link>

        <Link
          className={`page-tab${tab === "notifications" ? " is-active" : ""}`}
          href="/settings?tab=notifications"
          aria-current={tab === "notifications" ? "page" : undefined}
        >
          Notifications
        </Link>

        <Link
          className={`page-tab${tab === "access" ? " is-active" : ""}`}
          href="/settings?tab=access"
          aria-current={tab === "access" ? "page" : undefined}
        >
          Account access
        </Link>
      </nav>

      <div className="settings-stack">
        {tab === "appearance" ? (
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Dark mode follows your device by default. Pick a theme to pin this
                browser to light or dark instead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSetting />
            </CardContent>
          </Card>
        ) : null}

        {tab === "notifications" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose how Scrum Master reminds you about overdue tasks, tasks
                  that start soon and everything coming up later today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={saveNotificationSettings} className="settings-form">
                  <label className="setting-row">
                    <span className="setting-text">
                      <span className="setting-name">Browser notifications</span>
                      <span className="setting-hint">
                        Show a desktop alert for overdue tasks and tasks that are
                        starting. Your browser must allow notifications for this
                        site.
                      </span>
                    </span>

                    <Switch
                      name="notify_browser"
                      value="1"
                      defaultChecked={user.profile.notify_browser}
                    />
                  </label>

                  <label className="setting-row">
                    <span className="setting-text">
                      <span className="setting-name">Email notifications</span>
                      <span className="setting-hint">
                        Send a digest to <strong>{user.profile.email}</strong> when
                        something needs your attention.
                      </span>
                    </span>

                    <Switch
                      name="notify_email"
                      value="1"
                      defaultChecked={user.profile.notify_email}
                    />
                  </label>

                  <div className="field setting-lead">
                    <Label htmlFor="notify_lead_minutes">
                      Remind me before a task starts
                    </Label>
                    <select
                      className="input"
                      id="notify_lead_minutes"
                      name="notify_lead_minutes"
                      defaultValue={leadMinutes}
                    >
                      {NOTIFICATION_LEAD_OPTIONS.map((minutes) => (
                        <option value={minutes} key={minutes}>
                          {formatMinutes(minutes)} before
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" size="sm">
                    Save notification settings
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser permission</CardTitle>
                <CardDescription>
                  Scrum Master asks the browser once. If alerts do not appear, allow
                  notifications for this site in your browser&rsquo;s settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionPanel />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email delivery</CardTitle>
                <CardDescription>
                  The notification job sends a digest to{" "}
                  <strong>{user.profile.email}</strong> using the{" "}
                  <code>{transport}</code> transport
                  {configured ? "." : ", which still needs configuring."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={sendTestEmail}>
                  <Button type="submit" variant="outline" size="sm">
                    Send test email
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}

        {tab === "access" ? (
          <Card>
            <CardHeader>
              <CardTitle>Account access</CardTitle>
              <CardDescription>
                Manage access to this browser session. To change your name, email or
                password, open{" "}
                <Link className="inline-link" href="/account">
                  your account
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="card-title">Sign out</h3>
                <p className="card-sub mt-1">
                  You will need to sign in again to see your tasks. This browser will
                  forget the current session.
                </p>
              </div>

              <ConfirmForm
                action={signOut}
                confirmTitle="Sign out of Scrum Master?"
                confirmMessage="You will need to sign in again to see your tasks."
                confirmLabel="Sign out"
              >
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </ConfirmForm>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
