<?php

/**
 * templates/layout.php
 *
 * Master page: sidebar + top bar + content + modals.
 *
 * Available variables (passed by HomeController):
 * $profile, $showOnboarding, $page, $q, $todos, $counts, $greeting,
 * $today, $editTodo, $openAdd, $returnTo, $flash
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>KPIMe</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>

<?php require ROOT_PATH . '/templates/partials/sidebar.php'; ?>

<div class="main">

    <?php require ROOT_PATH . '/templates/partials/topbar.php'; ?>

    <main class="content">

        <header class="page-header">
            <div class="page-heading">
                <h1 class="greeting"><?= e($greeting) ?></h1>
                <p class="date-line"><?= e($today) ?></p>
            </div>

            <?php
            // Opens the Add Todo modal. Without JS it is a normal link
            // (?add=1 renders the modal server-side); app.js upgrades it to
            // an in-page modal open.
            $addHref = 'index.php' . $returnTo . ($returnTo === '' ? '?' : '&') . 'add=1';
            ?>
            <a class="btn-add" href="<?= e($addHref) ?>" data-modal-open="todo-modal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                </svg>
                Add Todo
            </a>
        </header>

        <section class="panel" aria-label="Todos">
            <?php if (!$todos): ?>
                <p class="empty">
                    <?php if ($q !== ''): ?>
                        No todos match &ldquo;<?= e($q) ?>&rdquo;.
                    <?php else: ?>
                        Nothing here yet — press <strong>Add Todo</strong> to create your first task.
                    <?php endif; ?>
                </p>
            <?php else: ?>
                <?php foreach ($todos as $todo): ?>
                    <?php require ROOT_PATH . '/templates/partials/todo-row.php'; ?>
                <?php endforeach; ?>
            <?php endif; ?>
        </section>

    </main>
</div>

<?php require ROOT_PATH . '/templates/modals/todo-form.php'; ?>

<?php if ($showOnboarding): ?>
    <?php require ROOT_PATH . '/templates/modals/onboarding.php'; ?>
<?php elseif ($flash !== null && $flash !== ''): ?>
    <div class="toast" role="status"><?= e($flash) ?></div>
<?php endif; ?>

<script src="assets/js/app.js" defer></script>

</body>
</html>
