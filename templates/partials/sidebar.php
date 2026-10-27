<?php

/**
 * templates/partials/sidebar.php
 *
 * Brand + primary navigation (desktop sidebar) and the phone bottom tab bar.
 * $page decides which list filter is highlighted, $view which page we are on,
 * $counts holds completed / in-progress totals and $user decides whether the
 * organization-only "Team" entry appears.
 */

$view = $view ?? 'home';
$isOwner = is_org_owner($user ?? null);

// Inline SVG icons (Lucide-style) — no icon font or external requests.
$icons = [
    'home' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    'completed' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
    'in-progress' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    'team' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'user' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
];

$query = $q !== '' ? '?q=' . urlencode($q) : '';
$filterQuery = static fn (string $filter): string => 'index.php?page=' . $filter . ($q !== '' ? '&q=' . urlencode($q) : '');

$homeHref = 'index.php' . $query;
$completedHref = $filterQuery('completed');
$inProgressHref = $filterQuery('in-progress');
$teamHref = 'index.php?r=team';
$profileHref = 'index.php?r=profile';

// Active states: list filters only on the home page, plus the two account pages.
$isHome = $view === 'home' && $page === 'home';
$isCompleted = $view === 'home' && $page === 'completed';
$isInProgress = $view === 'home' && $page === 'in-progress';
$isTeam = $view === 'team';
$isProfile = $view === 'profile';
?>
<aside class="sidebar">

    <div class="logo">KPIMe</div>

    <nav class="nav" aria-label="Primary">

        <a class="nav-item<?= $isHome ? ' is-active' : '' ?>"
           href="<?= e($homeHref) ?>"
           <?= $isHome ? 'aria-current="page"' : '' ?>>
            <?= $icons['home'] ?>
            <span class="nav-label">Home</span>
        </a>

        <a class="nav-item<?= $isCompleted ? ' is-active' : '' ?>"
           href="<?= e($completedHref) ?>"
           <?= $isCompleted ? 'aria-current="page"' : '' ?>>
            <?= $icons['completed'] ?>
            <span class="nav-label">Completed</span>
            <?php if ($counts['completed'] > 0): ?>
                <span class="badge badge--purple"><?= (int) $counts['completed'] ?></span>
            <?php endif; ?>
        </a>

        <a class="nav-item<?= $isInProgress ? ' is-active' : '' ?>"
           href="<?= e($inProgressHref) ?>"
           <?= $isInProgress ? 'aria-current="page"' : '' ?>>
            <?= $icons['in-progress'] ?>
            <span class="nav-label">In Progress</span>
            <?php if ($counts['in_progress'] > 0): ?>
                <span class="badge badge--amber"><?= (int) $counts['in_progress'] ?></span>
            <?php endif; ?>
        </a>

    </nav>

    <nav class="nav nav--account" aria-label="Account">

        <?php if ($isOwner): ?>
            <a class="nav-item<?= $isTeam ? ' is-active' : '' ?>"
               href="<?= e($teamHref) ?>"
               <?= $isTeam ? 'aria-current="page"' : '' ?>>
                <?= $icons['team'] ?>
                <span class="nav-label">Team</span>
            </a>
        <?php endif; ?>

        <a class="nav-item<?= $isProfile ? ' is-active' : '' ?>"
           href="<?= e($profileHref) ?>"
           <?= $isProfile ? 'aria-current="page"' : '' ?>>
            <?= $icons['user'] ?>
            <span class="nav-label">Profile</span>
        </a>

    </nav>
</aside>

<?php // Phone navigation: a bottom tab bar (the sidebar is hidden at that width). ?>
<nav class="tabbar" aria-label="Primary">

    <a class="tab<?= $isHome ? ' is-active' : '' ?>"
       href="<?= e($homeHref) ?>"
       <?= $isHome ? 'aria-current="page"' : '' ?>>
        <span class="tab-icon"><?= $icons['home'] ?></span>
        <span class="tab-label">Home</span>
    </a>

    <a class="tab<?= $isCompleted ? ' is-active' : '' ?>"
       href="<?= e($completedHref) ?>"
       <?= $isCompleted ? 'aria-current="page"' : '' ?>>
        <span class="tab-icon">
            <?= $icons['completed'] ?>
            <?php if ($counts['completed'] > 0): ?>
                <span class="badge badge--purple"><?= (int) $counts['completed'] ?></span>
            <?php endif; ?>
        </span>
        <span class="tab-label">Completed</span>
    </a>

    <a class="tab<?= $isInProgress ? ' is-active' : '' ?>"
       href="<?= e($inProgressHref) ?>"
       <?= $isInProgress ? 'aria-current="page"' : '' ?>>
        <span class="tab-icon">
            <?= $icons['in-progress'] ?>
            <?php if ($counts['in_progress'] > 0): ?>
                <span class="badge badge--amber"><?= (int) $counts['in_progress'] ?></span>
            <?php endif; ?>
        </span>
        <span class="tab-label">In Progress</span>
    </a>

    <?php if ($isOwner): ?>
        <a class="tab<?= $isTeam ? ' is-active' : '' ?>"
           href="<?= e($teamHref) ?>"
           <?= $isTeam ? 'aria-current="page"' : '' ?>>
            <span class="tab-icon"><?= $icons['team'] ?></span>
            <span class="tab-label">Team</span>
        </a>
    <?php endif; ?>

    <a class="tab<?= $isProfile ? ' is-active' : '' ?>"
       href="<?= e($profileHref) ?>"
       <?= $isProfile ? 'aria-current="page"' : '' ?>>
        <span class="tab-icon"><?= $icons['user'] ?></span>
        <span class="tab-label">Profile</span>
    </a>

</nav>
