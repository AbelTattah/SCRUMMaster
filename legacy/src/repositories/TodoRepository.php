<?php

/**
 * TodoRepository
 *
 * All database access for todos. Every query is prepared with bound
 * parameters — user input never becomes part of the SQL text.
 *
 * Every read/write is scoped to the signed-in user: the id alone is never
 * enough to touch a row, so one account can never edit another's tasks.
 * The organization account gets a read-only projection of its members'
 * tasks (forOrganization()).
 */

declare(strict_types=1);

final class TodoRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * List the user's todos for the current sidebar filter + search query.
     *
     * @param string $page 'home' (all), 'completed' or 'in-progress'
     * @param string $q    free-text title filter from the top search bar
     */
    public function all(int $userId, string $page = 'home', string $q = ''): array
    {
        $sql = 'SELECT * FROM todos WHERE user_id = :user';
        $params = [':user' => $userId];

        $sql .= $this->filter($page, $q, $params);
        $sql .= ' ORDER BY id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /**
     * Sidebar counters: completed vs. in progress.
     *
     * @return array{completed: int, in_progress: int}
     */
    public function counts(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS in_progress
             FROM todos
             WHERE user_id = :user'
        );

        $stmt->execute([':user' => $userId]);
        $row = $stmt->fetch();

        return [
            'completed' => (int) ($row['completed'] ?? 0),
            'in_progress' => (int) ($row['in_progress'] ?? 0),
        ];
    }

    /**
     * One todo, but only if it belongs to the user.
     */
    public function find(int $id, int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM todos WHERE id = :id AND user_id = :user');
        $stmt->execute([':id' => $id, ':user' => $userId]);

        $todo = $stmt->fetch();

        return $todo ?: null;
    }

    public function create(int $userId, string $title, ?string $startTime, ?string $endTime): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO todos (user_id, title, start_time, end_time)
             VALUES (:user, :title, :start_time, :end_time)'
        );

        $stmt->execute([
            ':user' => $userId,
            ':title' => $title,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
        ]);
    }

    /**
     * Flip the completed flag (the checkbox toggle).
     */
    public function toggle(int $id, int $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE todos
             SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END
             WHERE id = :id AND user_id = :user'
        );

        $stmt->execute([':id' => $id, ':user' => $userId]);
    }

    public function update(int $id, int $userId, string $title, ?string $startTime, ?string $endTime): void
    {
        $stmt = $this->db->prepare(
            'UPDATE todos
             SET title = :title,
                 start_time = :start_time,
                 end_time = :end_time
             WHERE id = :id AND user_id = :user'
        );

        $stmt->execute([
            ':title' => $title,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
            ':id' => $id,
            ':user' => $userId,
        ]);
    }

    public function delete(int $id, int $userId): void
    {
        $stmt = $this->db->prepare('DELETE FROM todos WHERE id = :id AND user_id = :user');
        $stmt->execute([':id' => $id, ':user' => $userId]);
    }

    /**
     * Give every task that predates accounts (user_id IS NULL) to the first
     * registered user, so the existing data survives the upgrade.
     *
     * @return int number of adopted rows
     */
    public function adoptOrphans(int $userId): int
    {
        $stmt = $this->db->prepare('UPDATE todos SET user_id = :user WHERE user_id IS NULL');
        $stmt->execute([':user' => $userId]);

        return $stmt->rowCount();
    }

    /**
     * Every task of every member of the organization, with the owner's name
     * and avatar for the "who is this for" label. Read-only view.
     */
    public function forOrganization(int $organizationId, string $page = 'home', string $q = ''): array
    {
        $sql = 'SELECT t.*, u.name AS owner_name, u.avatar AS owner_avatar
                FROM todos t
                JOIN users u ON u.id = t.user_id
                WHERE u.organization_id = :org';
        $params = [':org' => $organizationId];

        $sql .= $this->filter($page, $q, $params);
        $sql .= ' ORDER BY u.name COLLATE NOCASE ASC, t.id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /**
     * Shared WHERE fragment for the page filter + search.
     *
     * The search term is escaped for LIKE wildcards so "%" does not match
     * everything, then bound as a parameter.
     */
    private function filter(string $page, string $q, array &$params): string
    {
        $sql = '';

        if ($page === 'completed') {
            $sql .= ' AND completed = 1';
        } elseif ($page === 'in-progress') {
            $sql .= ' AND completed = 0';
        }

        if ($q !== '') {
            $escaped = addcslashes($q, '%_\\');
            $sql .= ' AND title LIKE :q ESCAPE \'\\\'';
            $params[':q'] = '%' . $escaped . '%';
        }

        return $sql;
    }
}
