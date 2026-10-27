<?php

/**
 * templates/partials/team-row.php
 *
 * One read-only task row on the organization account's team page: the member
 * it belongs to, the title and the time range. Checkboxes are disabled — the
 * organization account can see the team's tasks but not change them.
 *
 * Variable: $todo (with owner_name / owner_avatar joined in).
 */

$range = format_time_range($todo['start_time'] ?? null, $todo['end_time'] ?? null);
?>
<div class="todo-item team-row">

    <input
        type="checkbox"
        class="todo-check"
        <?= $todo['completed'] ? 'checked' : '' ?>
        disabled
        aria-label="<?= $todo['completed'] ? 'Completed' : 'In progress' ?>: <?= e($todo['title']) ?>"
    >

    <span class="todo-title"><?= e($todo['title']) ?></span>

    <span class="todo-meta">
        <span class="todo-owner">
            <img src="<?= e(avatar_url($todo['owner_avatar'] ?? null)) ?>" alt="">
            <?= e($todo['owner_name']) ?>
        </span>

        <?php if ($range !== null): ?>
            <span class="todo-time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                <span><?= e($range) ?></span>
            </span>
        <?php endif; ?>
    </span>

</div>
