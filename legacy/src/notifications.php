<?php

/**
 * src/notifications.php
 *
 * Notification rules for the signed-in user.
 *
 * Tasks in Scrum Master are planned for "today" and carry only a start/end time, so
 * a notification is derived from the clock instead of being stored:
 *
 *   overdue   — still open and its end time has already passed
 *   reminder  — starts within the lead time (or is happening right now)
 *   upcoming  — later today, outside the lead time
 *
 * The list is always computed from the current todos, so renaming, completing
 * or deleting a task is reflected immediately. Only the "read" / "emailed"
 * markers are persisted (notification_state) — see NotificationRepository.
 */

declare(strict_types=1);

/** Lead-time choices offered on the settings page (minutes). */
const NOTIFICATION_LEAD_OPTIONS = [5, 10, 15, 30, 60, 120];

/** Default lead time for accounts created before the setting existed. */
const NOTIFICATION_DEFAULT_LEAD = 30;

/**
 * Minutes before a task starts at which it becomes a reminder.
 */
function notification_lead_minutes(?array $user): int
{
    $value = (int) ($user['notify_lead_minutes'] ?? NOTIFICATION_DEFAULT_LEAD);

    return in_array($value, NOTIFICATION_LEAD_OPTIONS, true) ? $value : NOTIFICATION_DEFAULT_LEAD;
}

/**
 * "14:30" => 870. Null for an empty or malformed value.
 */
function notification_minutes(?string $time): ?int
{
    if ($time === null || !preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $time, $m)) {
        return null;
    }

    return ((int) $m[1]) * 60 + (int) $m[2];
}

/**
 * Current time as minutes since midnight.
 */
function notification_now_minutes(): int
{
    return ((int) date('G')) * 60 + ((int) date('i'));
}

/**
 * Human wording for a number of minutes: "1 minute", "12 minutes".
 */
function notification_minutes_label(int $minutes): string
{
    if ($minutes <= 0) {
        return 'less than a minute';
    }

    return $minutes . ' minute' . ($minutes === 1 ? '' : 's');
}

/**
 * Turn the user's open todos into the notification list.
 *
 * Each todo produces at most one item — the most urgent state wins.
 *
 * @param array<int, array<string, mixed>> $todos open (not completed) todos
 * @return array<int, array{
 *     key: string, kind: string, todo_id: int, title: string, detail: string,
 *     start_time: ?string, end_time: ?string, sort: int
 * }>
 */
function build_notifications(array $todos, int $leadMinutes, ?int $now = null): array
{
    $now ??= notification_now_minutes();
    $lead = max(0, $leadMinutes);

    $items = [];

    foreach ($todos as $todo) {
        if ((int) ($todo['completed'] ?? 0) === 1) {
            continue;
        }

        $id = (int) ($todo['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }

        $title = (string) ($todo['title'] ?? '');
        $startTime = $todo['start_time'] ?? null;
        $endTime = $todo['end_time'] ?? null;

        $start = notification_minutes(is_string($startTime) ? $startTime : null);
        $end = notification_minutes(is_string($endTime) ? $endTime : null);

        // 1. Past its end time and still open.
        if ($end !== null && $end < $now) {
            $items[] = [
                'key' => 'todo:' . $id . ':overdue',
                'kind' => 'overdue',
                'todo_id' => $id,
                'title' => $title,
                'detail' => 'Was due at ' . format_time((string) $endTime),
                'start_time' => is_string($startTime) ? $startTime : null,
                'end_time' => is_string($endTime) ? $endTime : null,
                'sort' => $end,
            ];
            continue;
        }

        // No start time: there is no moment to remind anyone about.
        if ($start === null) {
            continue;
        }

        // 2. Starting within the lead window, or already under way.
        if ($start <= $now + $lead) {
            if ($start > $now) {
                $detail = 'Starts in ' . notification_minutes_label($start - $now);
            } elseif ($end !== null) {
                $detail = 'Happening now — until ' . format_time((string) $endTime);
            } else {
                $detail = 'Started at ' . format_time((string) $startTime);
            }

            $items[] = [
                'key' => 'todo:' . $id . ':reminder',
                'kind' => 'reminder',
                'todo_id' => $id,
                'title' => $title,
                'detail' => $detail,
                'start_time' => is_string($startTime) ? $startTime : null,
                'end_time' => is_string($endTime) ? $endTime : null,
                'sort' => $start,
            ];
            continue;
        }

        // 3. Later today.
        $items[] = [
            'key' => 'todo:' . $id . ':upcoming',
            'kind' => 'upcoming',
            'todo_id' => $id,
            'title' => $title,
            'detail' => 'Starts at ' . format_time((string) $startTime),
            'start_time' => is_string($startTime) ? $startTime : null,
            'end_time' => is_string($endTime) ? $endTime : null,
            'sort' => $start,
        ];
    }

    usort($items, static function (array $a, array $b): int {
        $rank = ['overdue' => 0, 'reminder' => 1, 'upcoming' => 2];

        return [$rank[$a['kind']] ?? 9, $a['sort']] <=> [$rank[$b['kind']] ?? 9, $b['sort']];
    });

    return $items;
}

/**
 * Title shown above a group of notifications.
 */
function notification_kind_label(string $kind): string
{
    return match ($kind) {
        'overdue' => 'Overdue',
        'reminder' => 'Reminders',
        default => 'Coming up',
    };
}

/**
 * One-line explanation for a group.
 */
function notification_kind_hint(string $kind): string
{
    return match ($kind) {
        'overdue' => 'Still open and past their end time.',
        'reminder' => 'Starting soon or happening right now.',
        default => 'Scheduled for later today.',
    };
}

/**
 * Notification items for a user, with their read state attached.
 *
 * @return array<int, array<string, mixed>>
 */
function notifications_for_user(?array $user): array
{
    if ($user === null) {
        return [];
    }

    global $db;

    $todos = (new TodoRepository($db))->all((int) $user['id'], 'in-progress');
    $items = build_notifications($todos, notification_lead_minutes($user));

    return (new NotificationRepository($db))->withState((int) $user['id'], $items);
}

/**
 * Unread count for the bell badge (memoised per request — the sidebar, the top
 * bar and the layout all ask for it).
 */
function notification_unread_count(?array $user): int
{
    static $cache = [];

    if ($user === null) {
        return 0;
    }

    $id = (int) $user['id'];

    if (!array_key_exists($id, $cache)) {
        $unread = 0;

        foreach (notifications_for_user($user) as $item) {
            if (empty($item['read'])) {
                $unread++;
            }
        }

        $cache[$id] = $unread;
    }

    return $cache[$id];
}

/**
 * Items that deserve an operating-system notification: the actionable ones.
 * "Coming up" tasks are listed on the notifications screen but would only be
 * noise as a browser alert.
 *
 * @param array<int, array<string, mixed>> $items
 * @return array<int, array<string, mixed>>
 */
function notification_alertable(array $items): array
{
    return array_values(array_filter(
        $items,
        static fn (array $item): bool => empty($item['read'])
            && in_array($item['kind'], ['overdue', 'reminder'], true)
    ));
}

/**
 * Render the email digest for a user's current notifications.
 *
 * @param array<int, array<string, mixed>> $items
 * @param array<string, mixed> $user
 * @return array{0: string, 1: string, 2: string} [subject, text, html]
 */
function notification_digest(array $items, array $user): array
{
    $name = (string) ($user['name'] ?? 'there');
    $actionable = 0;

    foreach ($items as $item) {
        if (in_array($item['kind'], ['overdue', 'reminder'], true)) {
            $actionable++;
        }
    }

    if ($actionable === 0) {
        $subject = 'Scrum Master — your day at a glance';
        $intro = 'Here is your day at a glance:';
    } elseif ($actionable === 1) {
        $subject = 'Scrum Master — 1 task needs your attention';
        $intro = 'Here is what needs your attention today:';
    } else {
        $subject = 'Scrum Master — ' . $actionable . ' tasks need your attention';
        $intro = 'Here is what needs your attention today:';
    }

    $text = 'Hello ' . $name . ",\n\n" . $intro . "\n\n";
    $html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">'
        . '<h1 style="font-size:20px;font-weight:600;margin:0 0 4px;">Scrum Master</h1>'
        . '<p style="font-size:14px;color:#727272;margin:0 0 8px;">Hello ' . e($name) . ',</p>'
        . '<p style="font-size:14px;color:#727272;margin:0 0 20px;">' . e($intro) . '</p>';

    foreach (['overdue', 'reminder', 'upcoming'] as $kind) {
        $group = array_values(array_filter(
            $items,
            static fn (array $item): bool => $item['kind'] === $kind
        ));

        if ($group === []) {
            continue;
        }

        $label = notification_kind_label($kind);
        $hint = notification_kind_hint($kind);

        $text .= strtoupper($label) . ' — ' . $hint . "\n";

        foreach ($group as $item) {
            $text .= '- ' . $item['title'] . "\n  " . $item['detail'] . "\n";
        }

        $text .= "\n";

        $html .= '<h2 style="font-size:15px;font-weight:600;color:#21005D;margin:22px 0 2px;">' . e($label) . '</h2>'
            . '<p style="font-size:12px;color:#727272;margin:0 0 8px;">' . e($hint) . '</p>'
            . '<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">';

        foreach ($group as $item) {
            $html .= '<li><strong>' . e($item['title']) . '</strong><br>'
                . '<span style="color:#727272;">' . e($item['detail']) . '</span></li>';
        }

        $html .= '</ul>';
    }

    $text .= "Change these emails in Scrum Master → Settings.\n";
    $html .= '<p style="font-size:12px;color:#727272;margin:26px 0 0;">'
        . 'Change these emails in Scrum Master → Settings.</p></div>';

    return [$subject, $text, $html];
}
