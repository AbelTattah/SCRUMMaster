<?php

/**
 * templates/notifications.php
 *
 * The notifications screen: overdue tasks, tasks that are starting (or are
 * happening right now) and tasks coming up later today.
 *
 * Variables: $items, $groups, $unread.
 */

$items = $items ?? [];
$groups = $groups ?? ['overdue' => [], 'reminder' => [], 'upcoming' => []];
$unread = (int) ($unread ?? 0);
$total = count($items);
?>
<header class="page-header">
    <div class="page-heading">
        <h1 class="greeting">Notifications</h1>
        <p class="date-line">
            <?php if ($total === 0): ?>
                Nothing needs your attention right now.
            <?php else: ?>
                <?= (int) $unread ?> unread of <?= (int) $total ?> updated today.
            <?php endif; ?>
        </p>
    </div>

    <?php if ($unread > 0): ?>
        <form method="post" action="index.php" class="mark-all-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="notifications.read_all">
            <button class="btn-ghost btn-small" type="submit">Mark all as read</button>
        </form>
    <?php endif; ?>
</header>

<?php if ($total === 0): ?>

    <div class="card empty-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
        </svg>

        <h2>You're all caught up</h2>
        <p>
            Overdue tasks, reminders and tasks coming up later today will appear here.
        </p>

        <a class="btn-primary btn-small" href="index.php">Back to tasks</a>
    </div>

<?php else: ?>

    <div class="notification-groups">

        <?php foreach (['overdue', 'reminder', 'upcoming'] as $kind): ?>
            <?php if (($groups[$kind] ?? []) === []): ?>
                <?php continue; ?>
            <?php endif; ?>

            <section class="notification-group">
                <header class="notification-group-head">
                    <div>
                        <h2 class="notification-group-title"><?= e(notification_kind_label($kind)) ?></h2>
                        <p class="notification-group-hint"><?= e(notification_kind_hint($kind)) ?></p>
                    </div>

                    <span class="notification-count"><?= count($groups[$kind]) ?></span>
                </header>

                <div class="notification-list">
                    <?php foreach ($groups[$kind] as $item): ?>
                        <article class="notification-item<?= empty($item['read']) ? ' is-unread' : '' ?>">
                            <span class="notification-dot notification-dot--<?= e($kind) ?>" aria-hidden="true"></span>

                            <div class="notification-body">
                                <p class="notification-title"><?= e($item['title']) ?></p>
                                <p class="notification-detail">
                                    <?= e($item['detail']) ?>
                                    <?php if ($item['start_time'] !== null && $item['end_time'] !== null): ?>
                                        · <?= e(format_time_range($item['start_time'], $item['end_time'])) ?>
                                    <?php endif; ?>
                                </p>
                            </div>

                            <div class="notification-actions">
                                <a class="notification-open" href="index.php?edit=<?= (int) $item['todo_id'] ?>">Open</a>

                                <?php if (empty($item['read'])): ?>
                                    <form method="post" action="index.php">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="action" value="notifications.read">
                                        <input type="hidden" name="key" value="<?= e($item['key']) ?>">
                                        <button class="notification-read" type="submit">Mark read</button>
                                    </form>
                                <?php else: ?>
                                    <span class="notification-read-state">Read</span>
                                <?php endif; ?>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            </section>
        <?php endforeach; ?>

    </div>

<?php endif; ?>
