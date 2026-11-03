<?php

/**
 * templates/layout.php
 *
 * Shell for every signed-in page: sidebar + top bar + the page content +
 * optional modals. The content itself lives in the template named by $view
 * (home, profile, team, settings, notifications) and is rendered inside
 * <main>. The shared confirmation dialog is always available.
 *
 * Available variables (provided by the controllers):
 * $user, $view, $title, $page, $q, $counts, $flash, $showTodoModal,
 * $searchRoute, $returnTo
 */

$view = isset($view) && preg_match('/^[a-z-]+$/', (string) $view) ? (string) $view : 'home';
$title = $title ?? 'Scrum Master';
$searchRoute = $searchRoute ?? '';
$unread = notification_unread_count($user ?? null);
$browserNotifications = (int) ($user['notify_browser'] ?? 0) === 1;
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
<body
    data-notifications-feed="index.php?r=notifications.feed"
    data-browser-notifications="<?= $browserNotifications ? '1' : '0' ?>">

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

<?php // Reusable confirmation dialog for forms with data-confirm. ?>
<?php require ROOT_PATH . '/templates/partials/confirm-modal.php'; ?>

<?php if ($flash !== null && $flash !== ''): ?>
    <div class="toast" role="status"><?= e($flash) ?></div>
<?php endif; ?>

<script src="assets/js/app.js" defer></script>

</body>
</html>
