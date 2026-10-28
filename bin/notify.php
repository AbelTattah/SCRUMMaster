<?php

/**
 * bin/notify.php — send the notification email digest.
 *
 * Run it from cron / Task Scheduler, for example every 10 minutes:
 *
 *   php bin/notify.php
 *   php bin/notify.php --user=1
 *   php bin/notify.php --dry-run
 *
 * Only overdue tasks and tasks that start within the user's reminder window
 * trigger an email; tasks coming up later today are included in the digest as
 * a preview. A notification is emailed at most once (notification_state).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script runs from the command line only.\n");
}

require dirname(__DIR__) . '/src/bootstrap.php';

$options = getopt('', ['user:', 'dry-run', 'help']);

if ($options === false) {
    fwrite(STDERR, "Could not parse the options.\n");
    exit(1);
}

if (isset($options['help'])) {
    echo "Usage: php bin/notify.php [--user=ID] [--dry-run]\n";
    echo "  --user=ID   only consider this account\n";
    echo "  --dry-run   show what would be sent without sending or marking anything\n";
    exit(0);
}

$userOption = $options['user'] ?? null;
$userId = is_array($userOption) ? (int) end($userOption) : (int) $userOption;
$dryRun = isset($options['dry-run']);

$users = new UserRepository($db);

if ($userId > 0) {
    $account = $users->findWithOrganization($userId);
    $recipients = $account !== null ? [$account] : [];
} else {
    $recipients = $users->notificationRecipients();
}

if ($recipients === []) {
    echo 'No accounts to notify.', PHP_EOL;
    exit(0);
}

$sent = 0;
$skipped = 0;
$failed = 0;

foreach ($recipients as $user) {
    $label = $user['name'] . ' <' . $user['email'] . '>';

    if ((int) ($user['notify_email'] ?? 0) !== 1) {
        echo '  skip  ', $label, ' — email notifications are off', PHP_EOL;
        $skipped++;
        continue;
    }

    $items = notifications_for_user($user);

    $pending = array_values(array_filter(
        $items,
        static fn (array $item): bool => empty($item['emailed'])
            && in_array($item['kind'], ['overdue', 'reminder'], true)
    ));

    if ($pending === []) {
        echo '  skip  ', $label, ' — nothing new needs attention', PHP_EOL;
        $skipped++;
        continue;
    }

    [$subject, $text, $html] = notification_digest($items, $user);

    if ($dryRun) {
        echo '  would send  ', $label, ' — ', $subject, PHP_EOL;
        foreach ($pending as $item) {
            echo '      • ', $item['title'], ' — ', $item['detail'], PHP_EOL;
        }
        $sent++;
        continue;
    }

    $error = send_mail((string) $user['email'], $subject, $text, $html);

    if ($error !== null) {
        fwrite(STDERR, '  FAIL  ' . $label . ' — ' . $error . PHP_EOL);
        $failed++;
        continue;
    }

    (new NotificationRepository($db))->markEmailed(
        (int) $user['id'],
        array_column($pending, 'key')
    );

    echo '  sent  ', $label, ' — ', $subject, PHP_EOL;
    $sent++;
}

echo PHP_EOL, 'Done: ', $sent, ' sent, ', $skipped, ' skipped, ', $failed, ' failed (', mail_transport_label(), ' transport).', PHP_EOL;

exit($failed > 0 ? 1 : 0);
