<?php

require __DIR__ . '/../database/db.php';

$id = $_GET['id'] ?? null;

if (!$id) {
    header('Location: ../index.php');
    exit;
}

// Get the todo
$stmt = $db->prepare(
    'SELECT * FROM todos WHERE id = :id'
);

$stmt->execute([
    ':id' => $id
]);

$todo = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$todo) {
    die('Todo not found.');
}

// Update the todo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');

    if ($title !== '') {
        $stmt = $db->prepare(
            'UPDATE todos
             SET title = :title
             WHERE id = :id'
        );

        $stmt->execute([
            ':title' => $title,
            ':id' => $id
        ]);
    }

    header('Location: ../index.php');
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Edit Todo</title>
</head>
<body>

    <h1>Edit Todo</h1>

    <form method="POST" action="?id=<?= (int) $todo['id'] ?>">
        <input
            type="text"
            name="title"
            value="<?= htmlspecialchars($todo['title']) ?>"
            required
        >

        <button type="submit">Save Changes</button>
    </form>

    <a href="../index.php">Cancel</a>

</body>
</html>
