<?php

/**
 * ProfileRepository
 *
 * The single profile row (id = 1): display name + avatar path.
 */

declare(strict_types=1);

final class ProfileRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function get(): ?array
    {
        $stmt = $this->db->query('SELECT * FROM profiles WHERE id = 1');
        $row = $stmt->fetch();

        return $row ?: null;
    }

    /**
     * First-run onboarding: the name entered in the welcome modal.
     */
    public function saveName(string $name): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO profiles (id, name) VALUES (1, :name)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name'
        );

        $stmt->execute([':name' => $name]);
    }

    /**
     * Store the relative path of the uploaded avatar, e.g.
     * "uploads/avatars/9f3c....png".
     */
    public function setAvatar(?string $path): void
    {
        $stmt = $this->db->prepare('UPDATE profiles SET avatar = :avatar WHERE id = 1');
        $stmt->execute([':avatar' => $path]);
    }
}
