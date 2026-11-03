<?php

/**
 * NotificationsController
 *
 * The notifications screen, the JSON feed used for browser notifications and
 * the two "mark as read" actions.
 *
 * The list itself is derived from the user's open todos (src/notifications.php)
 * so it is always current; only the read/emailed markers are stored.
 */

declare(strict_types=1);

final class NotificationsController
{
    public static function index(): void
    {
        global $db;

        $user = require_auth();

        $items = notifications_for_user($user);
        $groups = ['overdue' => [], 'reminder' => [], 'upcoming' => []];

        foreach ($items as $item) {
            $groups[$item['kind']][] = $item;
        }

        $unread = 0;
        foreach ($items as $item) {
            if (empty($item['read'])) {
                $unread++;
            }
        }

        render('layout', [
            'view' => 'notifications',
            'title' => 'Scrum Master — Notifications',
            'showTodoModal' => false,
            'user' => $user,
            'page' => 'home',
            'q' => '',
            'searchRoute' => '',
            'counts' => (new TodoRepository($db))->counts((int) $user['id']),
            'returnTo' => '',
            'flash' => take_flash(),
            'items' => $items,
            'groups' => $groups,
            'unread' => $unread,
        ]);
    }

    /**
     * JSON feed polled by app.js. Only actionable notifications (overdue and
     * starting soon) are returned — "coming up" would just be noise as an OS
     * alert, though it is listed on the notifications screen.
     */
    public static function feed(): never
    {
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');

        $user = auth_user();

        if ($user === null) {
            http_response_code(401);
            echo json_encode(['items' => []]);
            exit;
        }

        $items = notification_alertable(notifications_for_user($user));

        $payload = array_map(
            static fn (array $item): array => [
                'key' => $item['key'],
                'kind' => $item['kind'],
                'todo_id' => $item['todo_id'],
                'title' => $item['title'],
                'detail' => $item['detail'],
            ],
            $items
        );

        echo json_encode(
            ['items' => $payload],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    public static function markRead(): never
    {
        verify_csrf();

        $user = require_auth();
        $key = (string) ($_POST['key'] ?? '');

        // Only keys that are currently on this user's list are accepted, so a
        // tampered value cannot create arbitrary state rows.
        $valid = array_column(notifications_for_user($user), 'key');

        if (in_array($key, $valid, true)) {
            global $db;

            (new NotificationRepository($db))->markRead((int) $user['id'], $key);
        }

        redirect('index.php?r=notifications');
    }

    public static function markAllRead(): never
    {
        verify_csrf();

        $user = require_auth();
        $items = notifications_for_user($user);

        $unread = array_values(array_filter(
            $items,
            static fn (array $item): bool => empty($item['read'])
        ));

        if ($unread !== []) {
            global $db;

            (new NotificationRepository($db))->markAllRead(
                (int) $user['id'],
                array_column($unread, 'key')
            );

            flash('All notifications marked as read.');
        } else {
            flash('There is nothing new to mark as read.');
        }

        redirect('index.php?r=notifications');
    }
}
