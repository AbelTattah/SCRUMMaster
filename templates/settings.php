<?php

/**
 * templates/settings.php
 *
 * Notification preferences, browser permission, email delivery and sign out.
 *
 * Variables: $user, $leadOptions, $leadMinutes, $mailTransport, $mailConfigured.
 */

$leadOptions = $leadOptions ?? NOTIFICATION_LEAD_OPTIONS;
$leadMinutes = (int) ($leadMinutes ?? NOTIFICATION_DEFAULT_LEAD);
$mailTransport = (string) ($mailTransport ?? mail_transport_label());
$mailConfigured = (bool) ($mailConfigured ?? mail_is_configured());
?>
<header class="page-header">
    <div class="page-heading">
        <h1 class="greeting">Settings</h1>
        <p class="date-line">Notifications and account access.</p>
    </div>
</header>

<div class="settings-stack">

    <section class="card">
        <h2 class="card-title">Notifications</h2>
        <p class="card-sub">
            Choose how KPIMe reminds you about overdue tasks, tasks that start soon
            and everything coming up later today.
        </p>

        <form method="post" action="index.php" class="settings-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="settings.save">

            <label class="setting-row">
                <span class="setting-text">
                    <span class="setting-name">Browser notifications</span>
                    <span class="setting-hint">
                        Show a desktop alert for overdue tasks and tasks that are starting.
                        Your browser must allow notifications for this site.
                    </span>
                </span>

                <span class="switch">
                    <input type="checkbox" name="notify_browser" value="1"
                        <?= (int) ($user['notify_browser'] ?? 0) === 1 ? 'checked' : '' ?>>
                    <span class="switch-track" aria-hidden="true"></span>
                </span>
            </label>

            <label class="setting-row">
                <span class="setting-text">
                    <span class="setting-name">Email notifications</span>
                    <span class="setting-hint">
                        Send a digest to <strong><?= e($user['email']) ?></strong> when
                        something needs your attention.
                    </span>
                </span>

                <span class="switch">
                    <input type="checkbox" name="notify_email" value="1"
                        <?= (int) ($user['notify_email'] ?? 0) === 1 ? 'checked' : '' ?>>
                    <span class="switch-track" aria-hidden="true"></span>
                </span>
            </label>

            <label class="field setting-lead">
                <span>Remind me before a task starts</span>
                <select class="input" name="notify_lead_minutes">
                    <?php foreach ($leadOptions as $minutes): ?>
                        <option value="<?= (int) $minutes ?>" <?= (int) $minutes === $leadMinutes ? 'selected' : '' ?>>
                            <?= e(notification_minutes_label((int) $minutes)) ?> before
                        </option>
                    <?php endforeach; ?>
                </select>
            </label>

            <button class="btn-primary btn-small" type="submit">Save notification settings</button>
        </form>
    </section>

    <section class="card">
        <h2 class="card-title">Browser permission</h2>
        <p class="card-sub">
            KPIMe asks the browser once. If alerts do not appear, allow notifications
            for this site in your browser's settings.
        </p>

        <p class="setting-status" data-notify-status>Checking permission…</p>

        <button class="btn-ghost btn-small" type="button" data-notify-request>
            Allow browser notifications
        </button>
    </section>

    <section class="card">
        <h2 class="card-title">Email delivery</h2>
        <p class="card-sub">
            The notification job sends a digest to <strong><?= e($user['email']) ?></strong>
            using the <code><?= e($mailTransport) ?></code> transport<?php if (!$mailConfigured): ?>,
            which still needs configuring<?php endif; ?>.
        </p>

        <form method="post" action="index.php">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="settings.test_email">
            <button class="btn-ghost btn-small" type="submit">Send test email</button>
        </form>
    </section>

    <section class="card">
        <h2 class="card-title">Sign out</h2>
        <p class="card-sub">
            You will need to sign in again to see your tasks. This browser will forget
            the current session.
        </p>

        <form method="post" action="index.php"
              data-confirm="You will need to sign in again to see your tasks."
              data-confirm-title="Sign out of KPIMe?"
              data-confirm-label="Sign out">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="auth.logout">
            <button class="btn-ghost btn-small" type="submit">Sign out</button>
        </form>
    </section>

</div>
