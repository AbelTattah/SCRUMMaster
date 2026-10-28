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
$unread = $unread ?? notification_unread_count($user ?? null);
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

        <a class="bell<?= $unread > 0 ? ' has-unread' : '' ?>"
           href="index.php?r=notifications"
           aria-label="Notifications<?= $unread > 0 ? ' (' . (int) $unread . ' unread)' : '' ?>"
           title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
            </svg>
            <?php if ($unread > 0): ?>
                <span class="bell-badge" aria-hidden="true"><?= $unread > 9 ? '9+' : (int) $unread ?></span>
            <?php endif; ?>
        </a>

        <?php // The sidebar (with its settings gear) is hidden on phones. ?>
        <a class="icon-btn topbar-settings" href="index.php?r=settings" aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        </a>

        <a class="avatar" href="index.php?r=profile" title="Your profile">
            <img src="<?= e(avatar_url($user['avatar'] ?? null)) ?>" alt="Profile picture">
        </a>

    </div>
</header>
