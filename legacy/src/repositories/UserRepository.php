<?php

/**
 * UserRepository
 *
 * Account rows: credentials, display name, avatar and organization link.
 * Every query is prepared; emails are stored lower-cased so the unique index
 * doubles as a case-insensitive guard.
 */

declare(strict_types=1);

final class UserRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * A user with the organization name/owner joined in (null organization
     * fields when the user is not part of one).
     */
    public function findWithOrganization(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT u.*,
                    o.name     AS organization_name,
                    o.owner_id AS organization_owner_id
             FROM users u
             LEFT JOIN organizations o ON o.id = u.organization_id
             WHERE u.id = :id'
        );

        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute([':email' => strtolower(trim($email))]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * The account linked to a Google id, if any.
     */
    public function findByGoogleId(string $googleId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE google_id = :google_id');
        $stmt->execute([':google_id' => $googleId]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Attach a Google account to an existing user (same verified email).
     */
    public function linkGoogle(int $id, string $googleId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET google_id = :google_id WHERE id = :id');
        $stmt->execute([':google_id' => $googleId, ':id' => $id]);
    }

    public function count(): int
    {
        return (int) $this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }

    /**
     * @param string $passwordHash '' for accounts created with Google only
     * @return int the new user id
     */
    public function create(
        string $name,
        string $email,
        string $passwordHash,
        ?string $avatar,
        ?string $googleId = null
    ): int {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password_hash, avatar, google_id)
             VALUES (:name, :email, :hash, :avatar, :google_id)'
        );

        $stmt->execute([
            ':name' => $name,
            ':email' => strtolower(trim($email)),
            ':hash' => $passwordHash,
            ':avatar' => $avatar,
            ':google_id' => $googleId,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function updateProfile(int $id, string $name, string $email): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET name = :name, email = :email WHERE id = :id'
        );

        $stmt->execute([
            ':name' => $name,
            ':email' => strtolower(trim($email)),
            ':id' => $id,
        ]);
    }

    public function updateAvatar(int $id, ?string $avatar): void
    {
        $stmt = $this->db->prepare('UPDATE users SET avatar = :avatar WHERE id = :id');
        $stmt->execute([':avatar' => $avatar, ':id' => $id]);
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $stmt = $this->db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $stmt->execute([':hash' => $passwordHash, ':id' => $id]);
    }

    public function setOrganization(int $id, ?int $organizationId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET organization_id = :org WHERE id = :id');
        $stmt->execute([':org' => $organizationId, ':id' => $id]);
    }

    /**
     * Notification preferences (the lead time is validated by the caller).
     */
    public function updateNotifications(int $id, bool $browser, bool $email, int $leadMinutes): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users
             SET notify_browser = :browser,
                 notify_email = :email,
                 notify_lead_minutes = :lead
             WHERE id = :id'
        );

        $stmt->execute([
            ':browser' => $browser ? 1 : 0,
            ':email' => $email ? 1 : 0,
            ':lead' => $leadMinutes,
            ':id' => $id,
        ]);
    }

    /**
     * Everyone who wants an email digest (used by bin/notify.php).
     *
     * @return array<int, array<string, mixed>>
     */
    public function notificationRecipients(): array
    {
        return $this->db->query(
            'SELECT * FROM users WHERE notify_email = 1 ORDER BY id ASC'
        )->fetchAll();
    }

    /**
     * Members of an organization, owner first, with their task counters.
     */
    public function members(int $organizationId): array
    {
        $stmt = $this->db->prepare(
            'SELECT u.id, u.name, u.email, u.avatar,
                    (u.id = o.owner_id) AS is_owner,
                    COUNT(t.id) AS todo_count,
                    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS completed_count
             FROM users u
             JOIN organizations o ON o.id = u.organization_id
             LEFT JOIN todos t ON t.user_id = u.id
             WHERE u.organization_id = :org
             GROUP BY u.id
             ORDER BY is_owner DESC, u.name COLLATE NOCASE ASC'
        );

        $stmt->execute([':org' => $organizationId]);

        return $stmt->fetchAll();
    }
}
