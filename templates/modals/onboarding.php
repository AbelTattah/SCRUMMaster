<?php

/**
 * templates/modals/onboarding.php
 *
 * The very first screen a new visitor sees: a name-input modal that cannot
 * be dismissed (there is nothing behind it worth reaching yet). The photo
 * upload is optional here — the top-bar avatar can change it later.
 *
 * Rendered by the layout only when $showOnboarding is true.
 */
?>
<div class="modal-backdrop is-open" id="onboarding" data-no-dismiss>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">

        <form method="post" action="index.php" enctype="multipart/form-data" class="modal-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="profile.save">

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
                        src="assets/img/default-avatar.png"
                        alt="Profile picture preview"
                        data-avatar-preview
                    >
                    <span class="hint">Upload photo</span>
                </label>
            </div>

            <h2 id="onboarding-title">Welcome to KPIMe!</h2>
            <p class="modal-sub">Before we start — what should we call you?</p>

            <label class="field">
                <span>Your name</span>
                <input
                    class="input"
                    type="text"
                    name="name"
                    placeholder="e.g. Abel"
                    maxlength="60"
                    required
                    autofocus
                >
            </label>

            <button class="btn-primary" type="submit">Get Started</button>

            <?php if (!empty($flash)): ?>
                <p class="form-error"><?= e($flash) ?></p>
            <?php endif; ?>
        </form>

    </div>
</div>
