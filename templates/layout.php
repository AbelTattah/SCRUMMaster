<?php

/**
 * templates/layout.php
 *
 * Shell for every signed-in page: sidebar + top bar + the page content +
 * optional modals. The content itself lives in the template named by $view
 * (home, profile, team) and is rendered inside <main>.
 *
 * Available variables (provided by the controllers):
 * $user, $view, $title, $page, $q, $counts, $flash, $showTodoModal,
 * $searchRoute, $returnTo
 */

$view = isset($view) && preg_match('/^[a-z-]+$/', (string) $view) ? (string) $view : 'home';
$title = $title ?? 'KPIMe';
$searchRoute = $searchRoute ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#FFFFFF">
    <title><?= e($title) ?></title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>

<?php require ROOT_PATH . '/templates/partials/sidebar.php'; ?>

<div class="main">

    <?php require ROOT_PATH . '/templates/partials/topbar.php'; ?>

    <main class="content">
        <?php require ROOT_PATH . '/templates/' . $view . '.php'; ?>
    </main>

</div>

<?php if (!empty($showTodoModal)): ?>
    <?php require ROOT_PATH . '/templates/modals/todo-form.php'; ?>
<?php endif; ?>

<?php if ($flash !== null && $flash !== ''): ?>
    <div class="toast" role="status"><?= e($flash) ?></div>
<?php endif; ?>

<script src="assets/js/app.js" defer></script>

</body>
</html>
