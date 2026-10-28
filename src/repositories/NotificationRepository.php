<?php

/**
 * NotificationRepository
 *
 * Persists only the state that cannot be derived from the clock: whether a
 * notification has been read and whether it has been emailed.
 *
 * A row is keyed by (user_id, notification_key) where the key is
 * "todo:{id}:{kind}". The kind is part of the key on purpose: the same task
 * can be a reminder now and overdue later, and both states are meaningful.
 */

declare(strict_types=1);

final class NotificationRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Attach read/emailed flags to a freshly computed notification list.
     *
     * @param array<int, array<string, mixed>> $items
     * @return array<int, array<string, mixed>>
     */
    public function withState(int $userId, array $items): array
    {
        if ($items === []) {
            return [];
        }

        $keys = array_values(array_unique(array_map(
            static fn (array $item): string => (string) $item['key'],
            $items
        )));

        $placeholders = implode(', ', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare(
            'SELECT notification_key, read_at, emailed_at
             FROM notification_state
             WHERE user_id = ? AND notification_key IN (' . $placeholders . ')'
        );

        $stmt->execute(array_merge([$userId], $keys));

        $state = [];
        foreach ($stmt->fetchAll() as $row) {
            $state[(string) $row['notification_key']] = $row;
        }

        foreach ($items as &$item) {
            $row = $state[(string) $item['key']] ?? null;
            $item['read'] = $row !== null && $row['read_at'] !== null;
            $item['emailed'] = $row !== null && $row['emailed_at'] !== null;
        }
        unset($item);

        return $items;
    }

    /**
     * Mark one notification as read. An existing read timestamp is kept so the
     * original moment is never lost.
     */
    public function markRead(int $userId, string $key): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO notification_state (user_id, notification_key, read_at)
             VALUES (:user, :key, :at)
             ON CONFLICT(user_id, notification_key)
             DO UPDATE SET read_at = COALESCE(notification_state.read_at, excluded.read_at)'
        );

        $stmt->execute([
            ':user' => $userId,
            ':key' => $key,
            ':at' => gmdate('Y-m-d H:i:s'),
        ]);
    }

    /**
     * @param array<int, string> $keys
     * @return int number of keys processed
     */
    public function markAllRead(int $userId, array $keys): int
    {
        $keys = array_values(array_unique(array_filter($keys, 'is_string')));

        if ($keys === []) {
            return 0;
        }

        $now = gmdate('Y-m-d H:i:s');
        $stmt = $this->db->prepare(
            'INSERT INTO notification_state (user_id, notification_key, read_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, notification_key)
             DO UPDATE SET read_at = COALESCE(notification_state.read_at, excluded.read_at)'
        );

        $this->db->beginTransaction();

        try {
            foreach ($keys as $key) {
                $stmt->execute([$userId, $key, $now]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return count($keys);
    }

    /**
     * Remember that these notifications were included in an email digest.
     *
     * @param array<int, string> $keys
     * @return int number of keys processed
     */
    public function markEmailed(int $userId, array $keys): int
    {
        $keys = array_values(array_unique(array_filter($keys, 'is_string')));

        if ($keys === []) {
            return 0;
        }

        $now = gmdate('Y-m-d H:i:s');
        $stmt = $this->db->prepare(
            'INSERT INTO notification_state (user_id, notification_key, emailed_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, notification_key)
             DO UPDATE SET emailed_at = COALESCE(notification_state.emailed_at, excluded.emailed_at)'
        );

        $this->db->beginTransaction();

        try {
            foreach ($keys as $key) {
                $stmt->execute([$userId, $key, $now]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        return count($keys);
    }
}
