<?php

require __DIR__ . '/../database/db.php';

$id = $_POST['id'] ?? null;

if ($id) {
    $stmt = $db->prepare(
        'DELETE FROM todos WHERE id = :id'
    );

    $stmt->execute([
        ':id' => $id
    ]);
}

header('Location: ../index.php');
exit;
