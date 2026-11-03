<?php

/**
 * SettingsController
 *
 * Notification preferences and email verification. The page itself is only a
 * signed-in screen; every POST is CSRF-checked and scoped to the current user.
 */

declare(strict_types=1);

final class SettingsController
{
    public static function show(): void
    {
        global $db;

        $user = require_auth();

        render('layout', [
            'view' => 'settings',
            'title' => 'Scrum Master — Settings',
            'showTodoModal' => false,
            'user' => $user,
            'page' => 'home',
            'q' => '',
            'searchRoute' => '',
            'counts' => (new TodoRepository($db))->counts((int) $user['id']),
            'returnTo' => '',
            'flash' => take_flash(),
            'leadOptions' => NOTIFICATION_LEAD_OPTIONS,
            'leadMinutes' => notification_lead_minutes($user),
            'mailTransport' => mail_transport_label(),
            'mailConfigured' => mail_is_configured(),
        ]);
    }

    /**
     * Save the browser/email switches and the reminder lead time.
     */
    public static function saveNotifications(): never
    {
        verify_csrf();

        $user = require_auth();

        $browser = isset($_POST['notify_browser']);
        $email = isset($_POST['notify_email']);
        $lead = (int) ($_POST['notify_lead_minutes'] ?? NOTIFICATION_DEFAULT_LEAD);

        if (!in_array($lead, NOTIFICATION_LEAD_OPTIONS, true)) {
            $lead = NOTIFICATION_DEFAULT_LEAD;
        }

        global $db;

        (new UserRepository($db))->updateNotifications((int) $user['id'], $browser, $email, $lead);

        flash('Notification settings saved.');
        redirect('index.php?r=settings');
    }

    /**
     * Send a test message to the signed-in account so the mail transport can
     * be verified without waiting for a real reminder.
     */
    public static function testEmail(): never
    {
        verify_csrf();

        $user = require_auth();

        $name = (string) ($user['name'] ?? 'there');
        $body = "Hello {$name},\n\n"
            . "This is a test notification from Scrum Master.\n\n"
            . 'Email delivery is working. Reminders, overdue tasks and tasks coming up later today will arrive here when they need your attention.' . "\n\n"
            . "Scrum Master";

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">'
            . '<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;">Scrum Master</h1>'
            . '<p style="font-size:14px;line-height:1.6;">Hello ' . e($name) . ',</p>'
            . '<p style="font-size:14px;line-height:1.6;">This is a test notification from Scrum Master.</p>'
            . '<p style="font-size:14px;line-height:1.6;">Email delivery is working. Reminders, overdue tasks and tasks coming up later today will arrive here when they need your attention.</p>'
            . '</div>';

        $error = send_mail((string) $user['email'], 'Scrum Master test notification', $body, $html);

        if ($error !== null) {
            flash('Test email failed: ' . $error);
        } else {
            flash('Test email sent to ' . $user['email'] . ' (via the ' . mail_transport_label() . ' transport).');
        }

        redirect('index.php?r=settings');
    }
}
