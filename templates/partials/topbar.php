<?php

/**
 * templates/partials/topbar.php
 *
 * Search box (a plain GET form — works without JS) + notifications bell +
 * the profile picture, which doubles as the "upload a new photo" control.
 *
 * $profile, $q, $page are provided by the layout.
 */

$avatar = $profile['avatar'] ?? null;
$avatarUrl = is_string($avatar) && $avatar !== ''
    ? $avatar
    : 'assets/img/default-avatar.png';
?>
<header class="topbar">

    <form class="search" method="get" action="index.php" role="search">
        <?php if ($page !== 'home'): ?>
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

        <form class="avatar-form" method="post" action="index.php" enctype="multipart/form-data">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="profile.avatar">
            <input type="hidden" name="return_to" value="<?= e($returnTo) ?>">

            <label class="avatar" title="Change profile picture">
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
                <img src="<?= e($avatarUrl) ?>" alt="Profile picture">
            </label>
        </form>

    </div>
</header>
