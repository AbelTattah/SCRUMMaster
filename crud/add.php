<?php

$db = new PDO('sqlite:database.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');

    if ($title !== '') {
        $stmt = $db->prepare(
            'INSERT INTO todos (title) VALUES (:title)'
        );

        $stmt->execute([
            ':title' => $title
        ]);
    }

    header('Location: index.php');
    exit;
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Add Todo</title>
</head>
<body>

    <h1>Add Todo</h1>

    <form method="POST">
        <input
            type="text"
            name="title"
            placeholder="Enter todo"
            required
        >

        <button type="submit">Add</button>
    </form>

    <a href="index.php">Back</a>

</body>
</html>