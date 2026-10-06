<?php

require __DIR__ . '/../database/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php');
    exit;
}

$title = trim($_POST['title'] ?? '');

if ($title !== '') {
    $stmt = $db->prepare(
        'INSERT INTO todos (title)
         VALUES (:title)'
    );

    $stmt->execute([
        ':title' => $title
    ]);
}

header('Location: ../index.php');
exit;
