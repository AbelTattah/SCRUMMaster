<?php

/**
 * templates/home.php
 *
 * The task list page: greeting, date, Add Todo button (desktop), FAB (phone)
 * and the rows. Rendered inside templates/layout.php.
 *
 * Variables: $greeting, $today, $todos, $q, $returnTo, $openAdd, $editTodo.
 */

$addHref = 'index.php' . $returnTo . ($returnTo === '' ? '?' : '&') . 'add=1';
?>
<header class="page-header">
    <div class="page-heading">
        <h1 class="greeting"><?= e($greeting) ?></h1>
        <p class="date-line"><?= e($today) ?></p>
    </div>

    <?php
    // Opens the Add Todo modal. Without JS it is a normal link
    // (?add=1 renders the modal server-side); app.js upgrades it to an
    // in-page modal open.
    ?>
    <a class="btn-add" href="<?= e($addHref) ?>" data-modal-open="todo-modal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
        </svg>
        Add Todo
    </a>
</header>

<?php // Phone only: floating action button (the desktop Add Todo button is hidden there). ?>
<a class="fab" href="<?= e($addHref) ?>" data-modal-open="todo-modal" aria-label="Add todo">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <path d="M5 12h14"/>
        <path d="M12 5v14"/>
    </svg>
</a>

<section class="panel" aria-label="Todos">
    <?php if (!$todos): ?>
        <p class="empty">
            <?php if ($q !== ''): ?>
                No todos match &ldquo;<?= e($q) ?>&rdquo;.
            <?php else: ?>
                Nothing here yet — press <strong class="only-desktop">Add Todo</strong><strong class="only-mobile">+</strong> to create your first task.
            <?php endif; ?>
        </p>
    <?php else: ?>
        <?php foreach ($todos as $todo): ?>
            <?php require ROOT_PATH . '/templates/partials/todo-row.php'; ?>
        <?php endforeach; ?>
    <?php endif; ?>
</section>
