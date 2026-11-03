<?php

/**
 * templates/auth/register.php
 *
 * Sign up — step 1 of 2: your details.
 *
 * Variables: $old (name, email), $avatar (photo kept from an earlier visit to
 * this step), $error, $flash, $hasLegacyData.
 *
 * Step 2 (personal or organization account) is templates/auth/register-type.php.
 */

require ROOT_PATH . '/templates/partials/auth-top.php';
?>
<div class="auth-card">

    <div class="auth-brand">KPIMe</div>
    <h1 class="auth-title">Create your account</h1>
    <p class="auth-sub">Step 1 of 2 — your details.</p>

    <ol class="steps" aria-label="Sign-up progress">
        <li class="step is-current" aria-current="step">
            <span>1</span> Your details
        </li>
        <li class="step">
            <span>2</span> Account type
        </li>
    </ol>

    <?php if (!empty($flash)): ?>
        <p class="auth-note" role="status"><?= e($flash) ?></p>
    <?php endif; ?>

    <?php if (!empty($hasLegacyData)): ?>
        <p class="auth-note">
            Your existing tasks<?php if (!empty($old['name'])): ?> and profile photo<?php endif; ?> will move into this account.
        </p>
    <?php endif; ?>

    <?php if (!empty($error)): ?>
        <p class="auth-error" role="alert"><?= e($error) ?></p>
    <?php endif; ?>

    <?php require ROOT_PATH . '/templates/partials/google-button.php'; ?>

    <p class="auth-divider"><span>or sign up with email</span></p>

    <form method="post" action="index.php" enctype="multipart/form-data" class="auth-form">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="auth.register.step1">

        <div class="avatar-picker">
            <label title="Upload a profile picture">
                <input
                    type="file"
                    name="avatar"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    data-avatar-input
                >
                <img
                    src="<?= e(avatar_url($avatar ?? null)) ?>"
                    alt="Profile picture preview"
                    data-avatar-preview
                >
                <span class="hint">Upload photo</span>
            </label>
        </div>

        <label class="field">
            <span>Your name</span>
            <input
                class="input"
                type="text"
                name="name"
                value="<?= e($old['name'] ?? '') ?>"
                placeholder="e.g. Abel"
                maxlength="60"
                autocomplete="name"
                required
                autofocus
            >
        </label>

        <label class="field">
            <span>Email</span>
            <input
                class="input"
                type="email"
                name="email"
                value="<?= e($old['email'] ?? '') ?>"
                autocomplete="email"
                required
            >
        </label>

        <label class="field">
            <span>Password</span>
            <input
                class="input"
                type="password"
                name="password"
                autocomplete="new-password"
                minlength="8"
                required
            >
            <span class="field-hint">At least 8 characters.</span>
        </label>

        <label class="field">
            <span>Confirm password</span>
            <input
                class="input"
                type="password"
                name="password_confirm"
                autocomplete="new-password"
                minlength="8"
                required
            >
        </label>

        <button class="btn-primary" type="submit">Continue</button>
    </form>

    <p class="auth-switch">
        Already have an account? <a href="index.php?r=login">Sign in</a>
    </p>

</div>
<?php require ROOT_PATH . '/templates/partials/auth-bottom.php'; ?>
