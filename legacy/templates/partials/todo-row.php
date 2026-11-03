<?php

/**
 * templates/partials/todo-row.php
 *
 * One task row: checkbox, title, time range and the "..." actions menu.
 *
 * Variables: $todo (id, title, completed, start_time, end_time), $returnTo.
 *
 * The checkbox lives in its own tiny form (laid out with display:contents so
 * it still sits inline as the first flex child) — that keeps it independent
 * from the menu's own forms, since HTML forbids nested forms.
 */

$range = format_time_range($todo['start_time'], $todo['end_time']);
$editHref = 'index.php' . $returnTo . ($returnTo === '' ? '?' : '&') . 'edit=' . (int) $todo['id'];
?>
<div class="todo-item">

    <form method="post" action="index.php" class="todo-toggle">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="todo.toggle">
        <input type="hidden" name="id" value="<?= (int) $todo['id'] ?>">
        <input type="hidden" name="return_to" value="<?= e($returnTo) ?>">

        <input
            type="checkbox"
            class="todo-check"
            <?= $todo['completed'] ? 'checked' : '' ?>
            aria-label="<?= $todo['completed'] ? 'Mark as not completed' : 'Mark as completed' ?>: <?= e($todo['title']) ?>"
        >
    </form>

    <span class="todo-title"><?= e($todo['title']) ?></span>

    <span class="todo-time">
        <?php if ($range !== null): ?>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
            </svg>
            <span><?= e($range) ?></span>
        <?php endif; ?>
    </span>

    <details class="kebab">
        <summary aria-label="Todo actions">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.7"/>
                <circle cx="12" cy="12" r="1.7"/>
                <circle cx="12" cy="19" r="1.7"/>
            </svg>
        </summary>

        <div class="kebab-menu">
            <a href="<?= e($editHref) ?>">Edit</a>

            <form method="post" action="index.php"
                  data-confirm="Delete “<?= e($todo['title']) ?>”? This cannot be undone."
                  data-confirm-title="Delete task?"
                  data-confirm-label="Delete">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="todo.delete">
                <input type="hidden" name="id" value="<?= (int) $todo['id'] ?>">
                <input type="hidden" name="return_to" value="<?= e($returnTo) ?>">
                <button type="submit" class="danger">Delete</button>
            </form>
        </div>
    </details>

</div>
