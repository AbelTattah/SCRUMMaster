<?php

require 'database/db.php';

$todos = $db->query("SELECT * FROM todos")->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html>
<head>
    <title>KPIMe</title>
</head>
<body>

<h1>Todos</h1>

<form action="crud/add.php" method="POST">
    <input name="title" placeholder="Enter a todo">
    <button type="submit">Add</button>
</form>

<ul>
    <?php foreach ($todos as $todo): ?>
        <li>
            <?php if ($todo['completed']): ?>
                <s><?= htmlspecialchars($todo['title']) ?></s>
            <?php else: ?>
                <?= htmlspecialchars($todo['title']) ?>
            <?php endif; ?>

            <?php if (!$todo['completed']): ?>
                <form action="crud/complete.php" method="POST" style="display:inline">
                    <input type="hidden" name="id" value="<?= (int) $todo['id'] ?>">
                    <button type="submit">Complete</button>
                </form>

                <a href="crud/edit.php?id=<?= (int) $todo['id'] ?>">
                    Edit
                </a>
            <?php endif; ?>

            <form action="crud/delete.php" method="POST" style="display:inline">
                <input type="hidden" name="id" value="<?= (int) $todo['id'] ?>">
                <button type="submit">Delete</button>
            </form>
        </li>
    <?php endforeach; ?>
</ul>

</body>
</html>
