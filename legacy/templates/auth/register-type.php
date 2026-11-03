<?php

/**
 * templates/auth/register-type.php
 *
 * Sign up — step 2 of 2: personal or organization account.
 *
 * This screen is shared by both sign-up routes:
 *
 *   - email + password: $draft['source'] === 'password'
 *   - Google:           $draft['source'] === 'google' (name, email and photo
 *                       come from Google and are not editable here)
 *
 * Variables: $draft, $type ('personal'|'organization'), $orgName, $error, $flash.
 */

$isGoogle = ($draft['source'] ?? '') === 'google';
$picture = $isGoogle
    ? (string) ($draft['picture'] ?? '')
    : avatar_url($draft['avatar'] ?? null);
$summaryPicture = $picture !== '' ? $picture : 'assets/img/default-avatar.png';

require ROOT_PATH . '/templates/partials/auth-top.php';
?>
<div class="auth-card">

    <div class="auth-brand">Scrum Master</div>
    <h1 class="auth-title">How will you use Scrum Master?</h1>
    <p class="auth-sub">Step 2 of 2 — choose your account type.</p>

    <ol class="steps" aria-label="Sign-up progress">
        <li class="step is-done">
            <span>&#10003;</span> Your details
        </li>
        <li class="step is-current" aria-current="step">
            <span>2</span> Account type
        </li>
    </ol>

    <?php if (!empty($flash)): ?>
        <p class="auth-note" role="status"><?= e($flash) ?></p>
    <?php endif; ?>

    <?php if (!empty($error)): ?>
        <p class="auth-error" role="alert"><?= e($error) ?></p>
    <?php endif; ?>


    <form method="post" action="index.php" class="auth-form">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="auth.register.step2">

        <div class="seg-wrap">
            <span class="seg-label" id="account-type-label">Account type</span>
            <div class="seg" role="radiogroup" aria-labelledby="account-type-label">
                <label>
                    <input type="radio" name="account_type" value="personal" data-account-type
                        <?= $type === 'personal' ? 'checked' : '' ?>>
                    Personal
                </label>
                <label>
                    <input type="radio" name="account_type" value="organization" data-account-type
                        <?= $type === 'organization' ? 'checked' : '' ?>>
                    Organization
                </label>
            </div>
            <span class="field-hint">
                Personal keeps a private task list. Organization lets you add members and
                see the tasks they share with the organization.
            </span>
        </div>

        <label class="field" data-org-field>
            <span>Organization name</span>
            <input
                class="input"
                type="text"
                name="org_name"
                value="<?= e($orgName) ?>"
                placeholder="e.g. Acme Studio"
                maxlength="80"
            >
            <span class="field-hint">Only used for organization accounts.</span>
        </label>

        <button class="btn-primary" type="submit">Create account</button>
    </form>

    <p class="auth-switch">
        <?php if ($isGoogle): ?>
            <a href="index.php?r=register&cancel=1">Cancel</a> and start over
        <?php else: ?>
            <a href="index.php?r=register">Back to your details</a>
        <?php endif; ?>
    </p>

</div>
<?php require ROOT_PATH . '/templates/partials/auth-bottom.php'; ?>
