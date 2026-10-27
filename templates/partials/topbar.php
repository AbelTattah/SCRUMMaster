<?php

/**
 * templates/partials/topbar.php
 *
 * Search box (a plain GET form — works without JS) + notifications bell +
 * the profile picture, which links to the account page.
 *
 * Variables: $user, $q, $page, $searchRoute (set to 'team' to keep the search
 * on the team page).
 */

$q = $q ?? '';
$page = $page ?? 'home';
$searchRoute = $searchRoute ?? '';
?>
<header class="topbar">

    <?php // Phone header: the sidebar (and its logo) is hidden at that width. ?>
    <a class="mobile-brand" href="index.php">KPIMe</a>

    <form class="search" method="get" action="index.php" role="search">
        <?php if ($searchRoute !== ''): ?>
            <input type="hidden" name="r" value="<?= e($searchRoute) ?>">
        <?php elseif ($page !== 'home'): ?>
            <input type="hidden" name="page" value="<?= e($page) ?>">
        <?php endif; ?>

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
        </svg>

        <input
            type="text"
            name="q"
            value="<?= e($q) ?>"
            placeholder="search  for task ..."
            aria-label="Search for a task"
        >
    </form>

    <div class="topbar-right">

        <button class="bell" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
            </svg>
        </button>

        <a class="avatar" href="index.php?r=profile" title="Your profile">
            <img src="<?= e(avatar_url($user['avatar'] ?? null)) ?>" alt="Profile picture">
        </a>

    </div>
</header>
