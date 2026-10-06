<?php

require __DIR__ . '/../database/db.php';

$id = $_POST['id'] ?? null;

if ($id) {
    $stmt = $db->prepare(
        'UPDATE todos
         SET completed = 1
         WHERE id = :id'
    );

    $stmt->execute([
        ':id' => $id
    ]);
}

header('Location: ../index.php');
exit;
