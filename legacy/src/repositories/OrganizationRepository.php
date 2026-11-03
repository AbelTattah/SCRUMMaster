<?php

/**
 * OrganizationRepository
 *
 * Organizations are owned by one user; membership is the users.organization_id
 * column. Adding/removing members therefore lives in UserRepository — this
 * class only creates and reads the organization itself.
 */

declare(strict_types=1);

final class OrganizationRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM organizations WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $organization = $stmt->fetch();

        return $organization ?: null;
    }

    /**
     * @return int the new organization id
     */
    public function create(string $name, int $ownerId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO organizations (name, owner_id) VALUES (:name, :owner)'
        );

        $stmt->execute([':name' => $name, ':owner' => $ownerId]);

        return (int) $this->db->lastInsertId();
    }
}
