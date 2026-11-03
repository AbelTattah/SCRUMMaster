<?php

/**
 * templates/auth/login.php
 *
 * Sign in — with email + password, or with Google.
 *
 * Variables: $email (preserved after a failed attempt), $error,
 * $flash (e.g. "You have been signed out.").
 */

require ROOT_PATH . '/templates/partials/auth-top.php';
?>
<div class="auth-card">

    <div class="auth-brand">KPIMe</div>
    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-sub">Sign in to pick up where you left off.</p>

    <?php if (!empty($flash)): ?>
        <p class="auth-note" role="status"><?= e($flash) ?></p>
    <?php endif; ?>

    <?php if (!empty($error)): ?>
        <p class="auth-error" role="alert"><?= e($error) ?></p>
    <?php endif; ?>

    <?php require ROOT_PATH . '/templates/partials/google-button.php'; ?>

    <p class="auth-divider"><span>or sign in with email</span></p>

    <form method="post" action="index.php" class="auth-form">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="auth.login">

        <label class="field">
            <span>Email</span>
            <input
                class="input"
                type="email"
                name="email"
                value="<?= e($email ?? '') ?>"
                autocomplete="email"
                required
                autofocus
            >
        </label>

        <label class="field">
            <span>Password</span>
            <input
                class="input"
                type="password"
                name="password"
                autocomplete="current-password"
                required
            >
        </label>

        <button class="btn-primary" type="submit">Sign in</button>
    </form>

    <p class="auth-switch">
        New to KPIMe? <a href="index.php?r=register">Create an account</a>
    </p>

</div>
<?php require ROOT_PATH . '/templates/partials/auth-bottom.php'; ?>
