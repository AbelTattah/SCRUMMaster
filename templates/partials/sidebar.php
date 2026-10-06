<?php

/**
 * templates/partials/sidebar.php
 *
 * Brand + primary navigation with the live counters from the design.
 * $page decides which item is highlighted; $counts holds completed /
 * in-progress totals.
 */

// Inline SVG icons (Lucide-style) — no icon font or external requests.
$icons = [
    'home' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    'completed' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>',
    'in-progress' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
];
?>
<aside class="sidebar">

    <div class="logo">KPIMe</div>

    <nav class="nav" aria-label="Primary">

        <a class="nav-item<?= $page === 'home' ? ' is-active' : '' ?>"
           href="index.php<?= $q !== '' ? '?q=' . urlencode($q) : '' ?>">
            <?= $icons['home'] ?>
            <span class="nav-label">Home</span>
        </a>

        <a class="nav-item<?= $page === 'completed' ? ' is-active' : '' ?>"
           href="index.php?page=completed<?= $q !== '' ? '&q=' . urlencode($q) : '' ?>">
            <?= $icons['completed'] ?>
            <span class="nav-label">Completed</span>
            <?php if ($counts['completed'] > 0): ?>
                <span class="badge badge--purple"><?= (int) $counts['completed'] ?></span>
            <?php endif; ?>
        </a>

        <a class="nav-item<?= $page === 'in-progress' ? ' is-active' : '' ?>"
           href="index.php?page=in-progress<?= $q !== '' ? '&q=' . urlencode($q) : '' ?>">
            <?= $icons['in-progress'] ?>
            <span class="nav-label">In Progress</span>
            <?php if ($counts['in_progress'] > 0): ?>
                <span class="badge badge--amber"><?= (int) $counts['in_progress'] ?></span>
            <?php endif; ?>
        </a>

    </nav>
</aside>
