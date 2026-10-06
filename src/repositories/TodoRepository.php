<?php

/**
 * TodoRepository
 *
 * All database access for todos. Every query is prepared with bound
 * parameters — user input never becomes part of the SQL text.
 */

declare(strict_types=1);

final class TodoRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * List todos for the current sidebar filter + search query.
     *
     * @param string $page 'home' (all), 'completed' or 'in-progress'
     * @param string $q    free-text title filter from the top search bar
     */
    public function all(string $page = 'home', string $q = ''): array
    {
        $sql = 'SELECT * FROM todos WHERE 1 = 1';
        $params = [];

        if ($page === 'completed') {
            $sql .= ' AND completed = 1';
        } elseif ($page === 'in-progress') {
            $sql .= ' AND completed = 0';
        }

        if ($q !== '') {
            // Escape LIKE wildcards so a search for "%" doesn't match
            // everything, then bind the pattern.
            $escaped = addcslashes($q, '%_\\');
            $sql .= ' AND title LIKE :q ESCAPE \'\\\'';
            $params[':q'] = '%' . $escaped . '%';
        }

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
    public function counts(): array
    {
        $stmt = $this->db->query(
            'SELECT
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS in_progress
             FROM todos'
        );

        $row = $stmt->fetch();

        return [
            'completed' => (int) ($row['completed'] ?? 0),
            'in_progress' => (int) ($row['in_progress'] ?? 0),
        ];
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM todos WHERE id = :id');
        $stmt->execute([':id' => $id]);

        $todo = $stmt->fetch();

        return $todo ?: null;
    }

    public function create(string $title, ?string $startTime, ?string $endTime): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO todos (title, start_time, end_time)
             VALUES (:title, :start_time, :end_time)'
        );

        $stmt->execute([
            ':title' => $title,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
        ]);
    }

    /**
     * Flip the completed flag (the checkbox toggle).
     */
    public function toggle(int $id): void
    {
        $stmt = $this->db->prepare(
            'UPDATE todos
             SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END
             WHERE id = :id'
        );

        $stmt->execute([':id' => $id]);
    }

    public function update(int $id, string $title, ?string $startTime, ?string $endTime): void
    {
        $stmt = $this->db->prepare(
            'UPDATE todos
             SET title = :title,
                 start_time = :start_time,
                 end_time = :end_time
             WHERE id = :id'
        );

        $stmt->execute([
            ':title' => $title,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
            ':id' => $id,
        ]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM todos WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }
}
