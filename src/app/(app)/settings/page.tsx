import type { Metadata } from "next";

import { signOut } from "@/app/actions/auth";
import { saveNotificationSettings, sendTestEmail } from "@/app/actions/settings";
import { ConfirmForm } from "@/components/ConfirmForm";
import { PermissionPanel } from "@/components/PermissionPanel";
import { ThemeSetting } from "@/components/ThemeSetting";
import { requireOnboardedUser } from "@/lib/auth";
import { mailIsConfigured, mailTransport } from "@/lib/mail";
import {
  NOTIFICATION_LEAD_OPTIONS,
  notificationLeadMinutes,
} from "@/lib/notifications";
import { formatMinutes } from "@/lib/time";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
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

      <div className="settings-stack">
        <section className="card">
          <h2 className="card-title">Appearance</h2>
          <p className="card-sub">
            Dark mode follows your device by default. Pick a theme to pin this
            browser to light or dark instead.
          </p>

          <ThemeSetting />
        </section>

        <section className="card">
          <h2 className="card-title">Notifications</h2>
          <p className="card-sub">
            Choose how Scrum Master reminds you about overdue tasks, tasks that start soon and
            everything coming up later today.
          </p>

          <form action={saveNotificationSettings} className="settings-form">
            <label className="setting-row">
              <span className="setting-text">
                <span className="setting-name">Browser notifications</span>
                <span className="setting-hint">
                  Show a desktop alert for overdue tasks and tasks that are starting. Your
                  browser must allow notifications for this site.
                </span>
              </span>

              <span className="switch">
                <input
                  type="checkbox"
                  name="notify_browser"
                  value="1"
                  defaultChecked={user.profile.notify_browser}
                />
                <span className="switch-track" aria-hidden="true" />
              </span>
            </label>

            <label className="setting-row">
              <span className="setting-text">
                <span className="setting-name">Email notifications</span>
                <span className="setting-hint">
                  Send a digest to <strong>{user.profile.email}</strong> when something needs
                  your attention.
                </span>
              </span>

              <span className="switch">
                <input
                  type="checkbox"
                  name="notify_email"
                  value="1"
                  defaultChecked={user.profile.notify_email}
                />
                <span className="switch-track" aria-hidden="true" />
              </span>
            </label>

            <label className="field setting-lead">
              <span>Remind me before a task starts</span>
              <select className="input" name="notify_lead_minutes" defaultValue={leadMinutes}>
                {NOTIFICATION_LEAD_OPTIONS.map((minutes) => (
                  <option value={minutes} key={minutes}>
                    {formatMinutes(minutes)} before
                  </option>
                ))}
              </select>
            </label>

            <button className="btn-primary btn-small" type="submit">
              Save notification settings
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Browser permission</h2>
          <p className="card-sub">
            Scrum Master asks the browser once. If alerts do not appear, allow notifications for this
            site in your browser&rsquo;s settings.
          </p>

          <PermissionPanel />
        </section>

        <section className="card">
          <h2 className="card-title">Email delivery</h2>
          <p className="card-sub">
            The notification job sends a digest to <strong>{user.profile.email}</strong> using
            the <code>{transport}</code> transport
            {configured ? "." : ", which still needs configuring."}
          </p>

          <form action={sendTestEmail}>
            <button className="btn-ghost btn-small" type="submit">
              Send test email
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Sign out</h2>
          <p className="card-sub">
            You will need to sign in again to see your tasks. This browser will forget the
            current session.
          </p>

          <ConfirmForm
            action={signOut}
            confirmTitle="Sign out of Scrum Master?"
            confirmMessage="You will need to sign in again to see your tasks."
            confirmLabel="Sign out"
          >
            <button className="btn-ghost btn-small" type="submit">
              Sign out
            </button>
          </ConfirmForm>
        </section>
      </div>
    </>
  );
}
