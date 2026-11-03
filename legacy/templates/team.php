<?php

/**
 * templates/team.php
 *
 * Organization account overview: every member's tasks, read-only.
 *
 * Variables: $organization, $members, $todos, $q, $filter.
 */

$filterHref = static function (string $page) use ($q): string {
    $href = 'index.php?r=team';
    if ($page !== 'home') {
        $href .= '&page=' . $page;
    }
    if ($q !== '') {
        $href .= '&q=' . urlencode($q);
    }

    return $href;
};
?>
<header class="page-header">
    <div class="page-heading">
        <h1 class="greeting">Team todos</h1>
        <p class="date-line"><?= e($organization['name']) ?> — everything your members are working on.</p>
    </div>
</header>

<div class="member-chips">
    <?php foreach ($members as $member): ?>
        <span class="chip">
            <img src="<?= e(avatar_url($member['avatar'] ?? null)) ?>" alt="">
            <?= e($member['name']) ?>
            <span class="chip-count"><?= (int) $member['todo_count'] ?></span>
        </span>
    <?php endforeach; ?>
</div>

<nav class="filter-pills" aria-label="Filter team todos">
    <a class="pill<?= $filter === 'home' ? ' is-active' : '' ?>" href="<?= e($filterHref('home')) ?>">All</a>
    <a class="pill<?= $filter === 'in-progress' ? ' is-active' : '' ?>" href="<?= e($filterHref('in-progress')) ?>">In Progress</a>
    <a class="pill<?= $filter === 'completed' ? ' is-active' : '' ?>" href="<?= e($filterHref('completed')) ?>">Completed</a>
</nav>

<section class="panel" aria-label="Team todos">
    <?php if (!$todos): ?>
        <p class="empty">
            <?php if ($q !== ''): ?>
                No team todos match &ldquo;<?= e($q) ?>&rdquo;.
            <?php else: ?>
                Nothing here yet — tasks appear as soon as your members add them.
            <?php endif; ?>
        </p>
    <?php else: ?>
        <?php foreach ($todos as $todo): ?>
            <?php require ROOT_PATH . '/templates/partials/team-row.php'; ?>
        <?php endforeach; ?>
    <?php endif; ?>
</section>
